import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { v4 as uuidv4 } from "uuid";
import { ensureStorageDirs, getInboxDir } from "@/lib/storage";

export type UploadSessionMeta = {
  id: string;
  packName: string;
  producer?: string | null;
  genre?: string | null;
  createdAt: string;
};

const SESSION_PREFIX = "upload-";
const META_FILE = ".upload-session.json";
const SESSION_MAX_AGE_MS = 48 * 60 * 60 * 1000;

function isValidSessionId(id: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(id);
}

export function getUploadSessionDir(id: string): string {
  if (!isValidSessionId(id)) throw new Error("Sessão de upload inválida");
  return path.join(getInboxDir(), `${SESSION_PREFIX}${id}`);
}

/** Resolve o caminho relativo dentro da sessão, bloqueando `..` e caminhos absolutos. */
export function resolveSessionFilePath(sessionDir: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some((part) => part === ".." || part === "")) {
    throw new Error(`Caminho inválido: ${relativePath}`);
  }
  if (path.basename(normalized) === META_FILE) {
    throw new Error("Nome de arquivo reservado");
  }
  const target = path.resolve(sessionDir, ...normalized.split("/"));
  const root = path.resolve(sessionDir);
  if (!target.startsWith(root + path.sep)) {
    throw new Error(`Caminho fora da sessão: ${relativePath}`);
  }
  return target;
}

function cleanupStaleSessions(): void {
  const inbox = getInboxDir();
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(inbox, { withFileTypes: true });
  } catch {
    return;
  }
  const now = Date.now();
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(SESSION_PREFIX)) continue;
    const full = path.join(inbox, entry.name);
    try {
      if (now - fs.statSync(full).mtimeMs > SESSION_MAX_AGE_MS) {
        fs.rmSync(full, { recursive: true, force: true });
      }
    } catch {
      /* ignore */
    }
  }
}

export function createUploadSession(meta: Omit<UploadSessionMeta, "id" | "createdAt">): UploadSessionMeta {
  ensureStorageDirs();
  cleanupStaleSessions();
  const session: UploadSessionMeta = {
    id: uuidv4(),
    packName: meta.packName,
    producer: meta.producer ?? null,
    genre: meta.genre ?? null,
    createdAt: new Date().toISOString(),
  };
  const dir = getUploadSessionDir(session.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, META_FILE), JSON.stringify(session), "utf8");
  return session;
}

export function readUploadSession(id: string): UploadSessionMeta {
  const dir = getUploadSessionDir(id);
  const metaPath = path.join(dir, META_FILE);
  if (!fs.existsSync(metaPath)) throw new Error("Sessão de upload não encontrada ou expirada");
  return JSON.parse(fs.readFileSync(metaPath, "utf8")) as UploadSessionMeta;
}

/**
 * Grava um pedaço do arquivo na posição `offset`.
 * offset 0 recria o arquivo; demais pedaços precisam começar exatamente no tamanho atual.
 */
export async function writeUploadChunk(options: {
  sessionId: string;
  relativePath: string;
  offset: number;
  body: WebReadableStream<Uint8Array>;
}): Promise<{ size: number }> {
  readUploadSession(options.sessionId);
  const dir = getUploadSessionDir(options.sessionId);
  const target = resolveSessionFilePath(dir, options.relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });

  const currentSize = fs.existsSync(target) ? fs.statSync(target).size : 0;
  if (options.offset !== 0 && options.offset !== currentSize) {
    throw new Error(`OFFSET_MISMATCH:${currentSize}`);
  }

  const stream = fs.createWriteStream(target, {
    flags: options.offset === 0 ? "w" : "a",
  });
  await pipeline(Readable.fromWeb(options.body), stream);
  fs.utimesSync(dir, new Date(), new Date());
  return { size: fs.statSync(target).size };
}

export function listUploadedFiles(id: string): Record<string, number> {
  const dir = getUploadSessionDir(id);
  const result: Record<string, number> = {};
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name !== META_FILE) {
        result[path.relative(dir, full).replace(/\\/g, "/")] = fs.statSync(full).size;
      }
    }
  }
  return result;
}

export function removeUploadSessionMeta(id: string): void {
  const metaPath = path.join(getUploadSessionDir(id), META_FILE);
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
}

export function discardUploadSession(id: string): void {
  const dir = getUploadSessionDir(id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
