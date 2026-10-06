import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { getInboxDir, getPackDir } from "@/lib/storage";
import { isSyncVpsEnabled, loadSyncVpsConfig, maskSyncVpsConfig } from "@/lib/sync-vps/config";
import {
  formatBytes,
  getDirectorySizeBytes,
  zipPackDirectory,
} from "@/lib/sync-vps/zip-pack";
import {
  fetchRemoteFreeBytes,
  getVpsCookie,
  LegacyVpsUploadRequired,
  listRemotePacks,
  uploadArchiveToVps,
  uploadPackDirectoryToVps,
  type RemotePackSummary,
} from "@/lib/sync-vps/vps-client";

import { CLOUD_SAVED_PACK_DESCRIPTION } from "@/lib/sync-vps/save-cloud-sample";

/** Packs locais que podem ir pro VPS (exclui os criados só com favoritos baixados da nuvem). */
export const notCloudSavedPack = {
  OR: [{ description: null }, { description: { not: CLOUD_SAVED_PACK_DESCRIPTION } }],
};

/** Folga mínima que precisa sobrar no VPS depois do upload (sistema, banco, outros apps). */
const MIN_REMOTE_FREE_AFTER_UPLOAD = 3 * 1024 ** 3;

function normalizePackName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildRemoteIndex(remote: RemotePackSummary[]) {
  const bySlug = new Map(remote.map((p) => [p.slug.toLowerCase(), p]));
  const byName = new Map(remote.map((p) => [normalizePackName(p.name), p]));
  return {
    find(pack: { slug: string; name: string }): RemotePackSummary | undefined {
      return bySlug.get(pack.slug.toLowerCase()) ?? byName.get(normalizePackName(pack.name));
    },
    add(pack: RemotePackSummary) {
      bySlug.set(pack.slug.toLowerCase(), pack);
      byName.set(normalizePackName(pack.name), pack);
    },
  };
}

export type SyncItemStatus =
  | "pending"
  | "zipping"
  | "uploading"
  | "done"
  | "skipped"
  | "failed";

export type SyncQueueItem = {
  packId: string;
  slug: string;
  name: string;
  sizeBytes: number;
  status: SyncItemStatus;
  progress: number;
  phase: string;
  error?: string;
  remoteSlug?: string;
};

export type SyncQueueState = {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  items: SyncQueueItem[];
  summary: string | null;
};

let queueState: SyncQueueState = {
  running: false,
  startedAt: null,
  finishedAt: null,
  items: [],
  summary: null,
};

export function getSyncQueueState(): SyncQueueState {
  return queueState;
}

function updateItem(packId: string, patch: Partial<SyncQueueItem>) {
  queueState = {
    ...queueState,
    items: queueState.items.map((item) =>
      item.packId === packId ? { ...item, ...patch } : item,
    ),
  };
}

async function processQueue(): Promise<void> {
  const config = loadSyncVpsConfig();
  if (!config) {
    queueState = {
      ...queueState,
      running: false,
      finishedAt: new Date().toISOString(),
      summary: "Configure o VPS antes de sincronizar",
    };
    return;
  }

  let remoteIndex: ReturnType<typeof buildRemoteIndex>;
  try {
    remoteIndex = buildRemoteIndex(await listRemotePacks(config));
  } catch (err) {
    queueState = {
      ...queueState,
      running: false,
      finishedAt: new Date().toISOString(),
      summary: err instanceof Error ? err.message : "Falha ao listar VPS",
    };
    return;
  }

  for (const item of queueState.items) {
    if (item.status === "skipped" || item.status === "done") continue;

    if (remoteIndex.find(item)) {
      updateItem(item.packId, {
        status: "skipped",
        progress: 100,
        phase: "Já existe no VPS",
      });
      continue;
    }

    const pack = await prisma.pack.findUnique({ where: { id: item.packId } });
    if (!pack) {
      updateItem(item.packId, {
        status: "failed",
        error: "Pack não encontrado localmente",
      });
      continue;
    }

    const remoteFree = await fetchRemoteFreeBytes(config);
    if (remoteFree !== null && remoteFree < item.sizeBytes + MIN_REMOTE_FREE_AFTER_UPLOAD) {
      updateItem(item.packId, {
        status: "failed",
        error: `Sem espaço no VPS: o pack tem ${formatBytes(item.sizeBytes)} e o VPS tem ${formatBytes(remoteFree)} livres. Exclua packs do VPS e tente de novo.`,
      });
      continue;
    }

    const zipPath = path.join(getInboxDir(), `sync-${item.slug}-${uuidv4()}.zip`);
    const meta = { packName: pack.name, producer: pack.producer, genre: pack.genre };
    try {
      updateItem(item.packId, {
        status: "uploading",
        progress: 0,
        phase: "Enviando em partes para o VPS…",
      });

      let result: { slug: string; sampleCount: number; message: string };
      try {
        result = await uploadPackDirectoryToVps(config, getPackDir(pack.slug), meta, (percent, phase) =>
          updateItem(item.packId, { progress: percent, phase }),
        );
      } catch (err) {
        if (!(err instanceof LegacyVpsUploadRequired)) throw err;

        updateItem(item.packId, { status: "zipping", progress: 0, phase: "Compactando pack…" });
        await zipPackDirectory(item.slug, zipPath, (percent) => {
          updateItem(item.packId, { progress: percent, phase: `Compactando… ${percent}%` });
        });
        updateItem(item.packId, { status: "uploading", progress: 0, phase: "Enviando ZIP…" });
        result = await uploadArchiveToVps(
          config,
          await getVpsCookie(config),
          zipPath,
          `${item.slug}.zip`,
          meta,
          (phase) => updateItem(item.packId, { phase }),
        );
      }

      remoteIndex.add({
        id: "",
        slug: result.slug,
        name: pack.name,
        producer: pack.producer,
        genre: pack.genre,
        coverPath: null,
        sampleCount: result.sampleCount,
        importedAt: null,
      });
      updateItem(item.packId, {
        status: "done",
        progress: 100,
        phase: result.message,
        remoteSlug: result.slug,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha no envio";
      const diskFull =
        /no space left|disk is full|ENOSPC|database or disk is full/i.test(msg);
      updateItem(item.packId, {
        status: "failed",
        error: diskFull
          ? "Disco do VPS cheio — libere espaço e tente de novo"
          : msg,
        phase: "Erro",
      });
      if (diskFull) {
        queueState = {
          ...queueState,
          running: false,
          finishedAt: new Date().toISOString(),
          summary: "Parado: disco do VPS cheio. Libere espaço e reenvie os pendentes.",
        };
        return;
      }
    } finally {
      try {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      } catch {
        /* ignore */
      }
    }
  }

  const done = queueState.items.filter((i) => i.status === "done").length;
  const skipped = queueState.items.filter((i) => i.status === "skipped").length;
  const failed = queueState.items.filter((i) => i.status === "failed").length;

  queueState = {
    ...queueState,
    running: false,
    finishedAt: new Date().toISOString(),
    summary: `Concluído: ${done} enviados, ${skipped} já no VPS, ${failed} com erro`,
  };
}

export async function startSyncQueue(packIds: string[]): Promise<{ ok: boolean; error?: string }> {
  if (queueState.running) {
    return { ok: false, error: "Já existe uma sincronização em andamento" };
  }

  const packs = await prisma.pack.findMany({
    where: { id: { in: packIds } },
    orderBy: { importedAt: "asc" },
  });

  const sorted = [...packs].sort(
    (a, b) =>
      getDirectorySizeBytes(getPackDir(a.slug)) -
      getDirectorySizeBytes(getPackDir(b.slug)),
  );

  if (packs.length === 0) {
    return { ok: false, error: "Nenhum pack selecionado" };
  }

  queueState = {
    running: true,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    summary: null,
    items: sorted.map((pack) => ({
      packId: pack.id,
      slug: pack.slug,
      name: pack.name,
      sizeBytes: getDirectorySizeBytes(getPackDir(pack.slug)),
      status: "pending",
      progress: 0,
      phase: "Na fila",
    })),
  };

  void processQueue();
  return { ok: true };
}

export async function getSyncStatusOverview() {
  const config = loadSyncVpsConfig();
  const localPacks = await prisma.pack.findMany({
    orderBy: { importedAt: "desc" },
    where: notCloudSavedPack,
    select: {
      id: true,
      slug: true,
      name: true,
      producer: true,
      sampleCount: true,
      importedAt: true,
    },
  });

  let remoteIndex = buildRemoteIndex([]);
  let remoteError: string | null = null;

  if (config) {
    try {
      remoteIndex = buildRemoteIndex(await listRemotePacks(config));
    } catch (err) {
      remoteError = err instanceof Error ? err.message : "Erro ao conectar no VPS";
    }
  }

  return {
    enabled: isSyncVpsEnabled(),
    config: config
      ? { vpsUrl: config.vpsUrl, email: config.email, hasPassword: true }
      : null,
    remoteError,
    queue: getSyncQueueState(),
    packs: localPacks.map((pack) => {
      const sizeBytes = getDirectorySizeBytes(getPackDir(pack.slug));
      const remote = remoteIndex.find(pack);
      const onVps = Boolean(remote);
      return {
        ...pack,
        sizeBytes,
        sizeLabel: formatBytes(sizeBytes),
        onVps,
        remotePackId: remote?.id ?? null,
        syncStatus: onVps ? ("remote" as const) : ("local_only" as const),
      };
    }),
  };
}
