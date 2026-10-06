import fs from "fs";
import path from "path";
import { getPacksDir, getStorageRoot } from "@/lib/storage";

export type StorageUsage = {
  /** Disco onde fica o storage (no VPS é o disco inteiro do servidor). */
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  /** Só os packs de samples. */
  packsBytes: number;
  packCount: number;
  computedAt: string;
};

const CACHE_MS = 10 * 60 * 1000;
let cache: { value: StorageUsage; at: number } | null = null;
let inflight: Promise<StorageUsage> | null = null;

async function directorySize(dir: string): Promise<number> {
  let total = 0;
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await directorySize(full);
    } else if (entry.isFile()) {
      try {
        total += (await fs.promises.stat(full)).size;
      } catch {
        /* arquivo sumiu durante a contagem */
      }
    }
  }
  return total;
}

/** Só o disco (instantâneo, sem somar os packs). */
export async function getDiskSpace() {
  const root = getStorageRoot();
  fs.mkdirSync(root, { recursive: true });
  const stats = await fs.promises.statfs(root);
  return {
    totalBytes: stats.blocks * stats.bsize,
    freeBytes: stats.bavail * stats.bsize,
    usedBytes: (stats.blocks - stats.bfree) * stats.bsize,
  };
}

async function compute(): Promise<StorageUsage> {
  const { totalBytes, freeBytes, usedBytes } = await getDiskSpace();

  const packsDir = getPacksDir();
  let packCount = 0;
  try {
    packCount = (await fs.promises.readdir(packsDir, { withFileTypes: true })).filter((d) =>
      d.isDirectory(),
    ).length;
  } catch {
    /* sem pasta de packs ainda */
  }

  return {
    totalBytes,
    freeBytes,
    usedBytes,
    packsBytes: await directorySize(packsDir),
    packCount,
    computedAt: new Date().toISOString(),
  };
}

export async function getStorageUsage(force = false): Promise<StorageUsage> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  if (!inflight) {
    inflight = compute()
      .then((value) => {
        cache = { value, at: Date.now() };
        return value;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Chamar depois de importar/excluir pack para o próximo GET recalcular. */
export function invalidateStorageUsage(): void {
  cache = null;
}
