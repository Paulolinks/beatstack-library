import FormData from "form-data";
import fs from "fs";
import path from "path";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { getSessionCookieName } from "@/lib/auth/session";
import type { SyncVpsConfig } from "@/lib/sync-vps/config";
import { normalizeVpsUrl } from "@/lib/sync-vps/normalize-url";

export type RemotePackSummary = {
  id: string;
  slug: string;
  name: string;
  producer: string | null;
  genre: string | null;
  coverPath: string | null;
  sampleCount: number;
  importedAt: string | null;
};

type RemotePackRow = {
  id: string;
  slug: string;
  name: string;
  producer?: string | null;
  genre?: string | null;
  coverPath?: string | null;
  sampleCount?: number;
  importedAt?: string | null;
  _count?: { samples?: number };
};

let cachedCookie: { key: string; cookie: string } | null = null;

function cacheKey(config: SyncVpsConfig): string {
  return `${normalizeVpsUrl(config.vpsUrl)}|${config.email}`;
}

/** Cookie de sessão "sync" reaproveitado entre chamadas (relogin automático em 401). */
export async function getVpsCookie(config: SyncVpsConfig, force = false): Promise<string> {
  const key = cacheKey(config);
  if (!force && cachedCookie?.key === key) return cachedCookie.cookie;
  const cookie = await loginToVps(config);
  cachedCookie = { key, cookie };
  return cookie;
}

export async function vpsFetch(
  config: SyncVpsConfig,
  pathname: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${normalizeVpsUrl(config.vpsUrl)}${pathname}`;
  const send = async (cookie: string) =>
    fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), Cookie: cookie },
    });

  let res = await send(await getVpsCookie(config));
  if (res.status === 401 && !(init.body instanceof ReadableStream)) {
    res = await send(await getVpsCookie(config, true));
  }
  return res;
}

function mapRemotePack(p: RemotePackRow): RemotePackSummary {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    producer: p.producer ?? null,
    genre: p.genre ?? null,
    coverPath: p.coverPath ?? null,
    sampleCount: p.sampleCount ?? p._count?.samples ?? 0,
    importedAt: p.importedAt ?? null,
  };
}

export async function listRemotePacks(config: SyncVpsConfig): Promise<RemotePackSummary[]> {
  const res = await vpsFetch(config, "/api/packs");
  if (!res.ok) {
    throw new Error(`Não foi possível listar packs no VPS (${res.status})`);
  }
  const data = (await res.json()) as { packs: RemotePackRow[] };
  return data.packs.map(mapRemotePack);
}

/** Bytes livres no disco do VPS; null se o VPS não tem a rota (versão antiga) ou falhou. */
export async function fetchRemoteFreeBytes(config: SyncVpsConfig): Promise<number | null> {
  try {
    const res = await vpsFetch(config, "/api/admin/storage-usage?diskOnly=1");
    if (!res.ok) return null;
    const data = (await res.json()) as { freeBytes?: number };
    return typeof data.freeBytes === "number" ? data.freeBytes : null;
  } catch {
    return null;
  }
}

export async function deleteRemotePack(
  config: SyncVpsConfig,
  remotePackId: string,
): Promise<{ name?: string; fileErrors?: string[] }> {
  const res = await vpsFetch(config, `/api/packs/${encodeURIComponent(remotePackId)}`, {
    method: "DELETE",
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    name?: string;
    fileErrors?: string[];
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Falha ao excluir no VPS (${res.status})`);
  }
  return data;
}

export class LegacyVpsUploadRequired extends Error {
  constructor() {
    super("VPS sem upload em partes — usando ZIP");
  }
}

const CHUNK_BYTES = 32 * 1024 * 1024;
const SKIP_UPLOAD_EXT = new Set([".rar", ".zip", ".7z", ".aif", ".aiff", ".tmp", ".part"]);
const MAX_UPLOAD_FILE_BYTES = 4 * 1024 * 1024 * 1024;

export function listPackFilesForUpload(packDir: string): Array<{ abs: string; rel: string; size: number }> {
  const files: Array<{ abs: string; rel: string; size: number }> = [];
  const stack = [packDir];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name.toLowerCase() === "__macosx") continue;
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      const lower = entry.name.toLowerCase();
      const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : "";
      if (SKIP_UPLOAD_EXT.has(ext)) continue;
      const size = fs.statSync(abs).size;
      if (size > MAX_UPLOAD_FILE_BYTES) continue;
      const rel = path.relative(packDir, abs).replace(/\\/g, "/");
      files.push({ abs, rel, size });
    }
  }
  return files;
}

function readChunk(fd: number, offset: number, length: number): Promise<Buffer> {
  const buffer = Buffer.alloc(length);
  return new Promise((resolve, reject) => {
    fs.read(fd, buffer, 0, length, offset, (err, bytesRead) => {
      if (err) reject(err);
      else resolve(bytesRead === length ? buffer : buffer.subarray(0, bytesRead));
    });
  });
}

/**
 * Envia a pasta do pack arquivo por arquivo, em pedaços de 32 MB, e o VPS indexa no final.
 * Ignora .rar/.zip internos e .aif (não tocam no player).
 */
export async function uploadPackDirectoryToVps(
  config: SyncVpsConfig,
  packDir: string,
  meta: UploadPackMeta,
  onProgress?: (percent: number, phase: string) => void,
): Promise<{ slug: string; sampleCount: number; message: string }> {
  const startRes = await vpsFetch(config, "/api/import/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meta),
  });
  if (startRes.status === 404 || startRes.status === 405) {
    throw new LegacyVpsUploadRequired();
  }
  const startData = (await startRes.json().catch(() => ({}))) as {
    sessionId?: string;
    error?: string;
  };
  if (!startRes.ok || !startData.sessionId) {
    throw new Error(startData.error ?? `Falha ao iniciar upload (${startRes.status})`);
  }
  const sessionId = startData.sessionId;

  const files = listPackFilesForUpload(packDir);
  if (files.length === 0) {
    throw new Error("Nenhum arquivo para enviar nesta pasta");
  }
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0) || 1;
  let sentBytes = 0;

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const fd = fs.openSync(file.abs, "r");
      try {
        let offset = 0;
        do {
          const length = Math.min(CHUNK_BYTES, file.size - offset);
          const chunk = length > 0 ? await readChunk(fd, offset, length) : Buffer.alloc(0);
          let attempt = 0;
          for (;;) {
            attempt++;
            const res = await vpsFetch(
              config,
              `/api/import/session/${sessionId}/file?path=${encodeURIComponent(file.rel)}&offset=${offset}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/octet-stream" },
                body: new Uint8Array(chunk),
              },
            ).catch((err: unknown) => err as Error);

            if (!(res instanceof Error) && res.ok) break;

            if (!(res instanceof Error) && res.status === 409) {
              const body = (await res.json().catch(() => ({}))) as { size?: number };
              if (typeof body.size === "number" && body.size >= 0 && body.size <= file.size) {
                sentBytes += body.size - offset;
                offset = body.size;
                break;
              }
            }

            const reason =
              res instanceof Error
                ? res.message
                : ((await res.json().catch(() => ({}))) as { error?: string }).error ??
                  `HTTP ${res.status}`;
            if (!(res instanceof Error) && res.status === 507) {
              throw new Error("Disco do VPS cheio — libere espaço e tente de novo");
            }
            if (attempt >= 4) {
              throw new Error(`Falha enviando ${file.rel}: ${reason}`);
            }
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
          if (length > 0) {
            offset += chunk.length;
            sentBytes += chunk.length;
          }
          onProgress?.(
            Math.min(99, Math.round((sentBytes / totalBytes) * 100)),
            `Enviando ${i + 1}/${files.length}: ${file.rel}`,
          );
        } while (offset < file.size);
      } finally {
        fs.closeSync(fd);
      }
    }

    onProgress?.(99, "VPS indexando o pack…");
    const finishRes = await vpsFetch(config, `/api/import/session/${sessionId}`, {
      method: "POST",
    });
    const finish = (await finishRes.json().catch(() => ({}))) as {
      error?: string;
      slug?: string;
      sampleCount?: number;
      message?: string;
    };
    if (!finishRes.ok) {
      throw new Error(finish.error ?? `VPS não conseguiu importar (${finishRes.status})`);
    }
    return {
      slug: finish.slug ?? meta.packName,
      sampleCount: finish.sampleCount ?? 0,
      message: finish.message ?? "Pack importado no VPS",
    };
  } catch (err) {
    await vpsFetch(config, `/api/import/session/${sessionId}`, { method: "DELETE" }).catch(
      () => undefined,
    );
    throw err;
  }
}

function parseSetCookie(headers: Headers): string {
  const cookieName = getSessionCookieName();
  const fromGetSetCookie = headers.getSetCookie?.();
  if (fromGetSetCookie?.length) {
    const pairs = fromGetSetCookie
      .map((c) => c.split(";")[0]!.trim())
      .filter((c) => c.startsWith(`${cookieName}=`));
    if (pairs.length) return pairs.join("; ");
  }
  const raw = headers.get("set-cookie");
  if (raw) {
    const parts = raw.split(/,(?=\s*[^;,]+=)/);
    const pairs = parts
      .map((p) => p.split(";")[0]!.trim())
      .filter((p) => p.startsWith(`${cookieName}=`));
    if (pairs.length) return pairs.join("; ");
  }
  return "";
}

export async function loginToVps(config: SyncVpsConfig): Promise<string> {
  const vpsUrl = normalizeVpsUrl(config.vpsUrl);
  const res = await fetch(`${vpsUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: config.email,
      password: config.password,
      client: "sync",
    }),
  });

  const data = (await res.json()) as { error?: string; pending?: boolean };
  if (!res.ok) {
    throw new Error(data.error ?? `Login VPS falhou (${res.status})`);
  }
  if (data.pending) {
    throw new Error("Conta VPS ainda não aprovada");
  }

  const cookieHeader = parseSetCookie(res.headers);
  const cookieName = getSessionCookieName();
  if (!cookieHeader.includes(cookieName)) {
    throw new Error("Sessão VPS não retornou cookie de login");
  }
  return cookieHeader;
}

export async function fetchRemotePackSlugs(
  config: SyncVpsConfig,
  cookie: string,
): Promise<Set<string>> {
  const res = await fetch(`${config.vpsUrl}/api/packs`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) {
    throw new Error(`Não foi possível listar packs no VPS (${res.status})`);
  }
  const data = (await res.json()) as {
    packs: Array<{ slug: string; name: string; sampleCount: number }>;
  };
  return new Set(data.packs.map((p) => p.slug));
}

export async function fetchRemotePacks(
  config: SyncVpsConfig,
  cookie: string,
): Promise<RemotePackSummary[]> {
  const res = await fetch(`${config.vpsUrl}/api/packs`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) {
    throw new Error(`Não foi possível listar packs no VPS (${res.status})`);
  }
  const data = (await res.json()) as { packs: RemotePackRow[] };
  return data.packs.map(mapRemotePack);
}

export type UploadPackMeta = {
  packName: string;
  producer?: string | null;
  genre?: string | null;
};

function readResponseBody(res: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    res.on("data", (chunk: Buffer) => chunks.push(chunk));
    res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    res.on("error", reject);
  });
}

/** Upload via form-data stream (estável para arquivos grandes). */
export async function uploadArchiveToVps(
  config: SyncVpsConfig,
  cookie: string,
  archivePath: string,
  archiveName: string,
  meta: UploadPackMeta,
  onPhase?: (phase: string) => void,
): Promise<{ slug: string; sampleCount: number; message: string }> {
  const form = new FormData();
  form.append("importType", "archive");
  form.append("packName", meta.packName);
  if (meta.producer) form.append("producer", meta.producer);
  if (meta.genre) form.append("genre", meta.genre);
  form.append("file", fs.createReadStream(archivePath), {
    filename: archiveName,
    contentType: "application/zip",
  });

  onPhase?.("uploading");

  const target = new URL(`${config.vpsUrl}/api/import`);
  const isHttps = target.protocol === "https:";
  const lib = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    form.submit(
      {
        protocol: isHttps ? "https:" : "http:",
        host: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        headers: { Cookie: cookie },
      },
      (err, res) => {
        if (err) {
          reject(err);
          return;
        }
        void readResponseBody(res).then((body) => {
          let data: {
            error?: string;
            slug?: string;
            sampleCount?: number;
            message?: string;
          } = {};
          try {
            data = JSON.parse(body) as typeof data;
          } catch {
            reject(new Error(`Resposta inválida do VPS (${res.statusCode}): ${body.slice(0, 200)}`));
            return;
          }
          if ((res.statusCode ?? 500) >= 400) {
            reject(new Error(data.error ?? `Upload VPS falhou (${res.statusCode})`));
            return;
          }
          resolve({
            slug: data.slug ?? meta.packName,
            sampleCount: data.sampleCount ?? 0,
            message: data.message ?? "Pack importado no VPS",
          });
        }, reject);
      },
    );
  });
}
