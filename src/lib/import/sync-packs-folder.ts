import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ensureStorageDirs, getPackDir, getPacksDir } from "@/lib/storage";
import { importPackFromArchive, deletePack } from "@/lib/import/service";
import { scanAudioFiles } from "@/lib/import/scan";
import { scanPresetBundles } from "@/lib/import/scan-presets";

const SKIP_DIR_NAMES = new Set([
  "inbox",
  "packs",
  "node_modules",
  "__macosx",
  ".git",
  ".trash",
]);

export type SyncPacksFolderResult = {
  scanned: number;
  added: Array<{ name: string; slug: string; sampleCount: number }>;
  removed: Array<{ name: string; slug: string }>;
  skipped: Array<{ folder: string; reason: string }>;
  errors: Array<{ folder: string; error: string }>;
};

function listPackCandidateDirs(packsRoot: string): string[] {
  if (!fs.existsSync(packsRoot)) return [];
  const entries = fs.readdirSync(packsRoot, { withFileTypes: true });
  const dirs: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name.startsWith(".")) continue;
    if (SKIP_DIR_NAMES.has(name.toLowerCase())) continue;
    dirs.push(path.join(packsRoot, name));
  }
  return dirs;
}

function folderHasImportableContent(dir: string): boolean {
  try {
    const audio = scanAudioFiles(dir);
    if (audio.length > 0) return true;
    return scanPresetBundles(dir).length > 0;
  } catch {
    return false;
  }
}

/**
 * Lê packs/ no disco e sincroniza com o banco:
 * - pastas novas → importa (indexa)
 * - packs no banco sem pasta → remove do banco
 */
export async function syncPacksFromStorageFolder(options?: {
  removeMissing?: boolean;
}): Promise<SyncPacksFolderResult> {
  ensureStorageDirs();
  const removeMissing = options?.removeMissing !== false;
  const packsRoot = getPacksDir();

  const result: SyncPacksFolderResult = {
    scanned: 0,
    added: [],
    removed: [],
    skipped: [],
    errors: [],
  };

  const diskDirs = listPackCandidateDirs(packsRoot);
  result.scanned = diskDirs.length;

  const dbPacks = await prisma.pack.findMany({
    select: { id: true, name: true, slug: true },
  });

  const dbBySlug = new Map(dbPacks.map((p) => [p.slug.toLowerCase(), p]));
  const matchedSlugs = new Set<string>();

  for (const dir of diskDirs) {
    const folderName = path.basename(dir);
    const existing = dbBySlug.get(folderName.toLowerCase());

    if (existing) {
      matchedSlugs.add(existing.slug.toLowerCase());
      // Pasta já registrada (slug = nome da pasta)
      continue;
    }

    // Pack cujo getPackDir(slug) aponta para este path (mesmo se slug ≠ nome)
    const byPath = dbPacks.find((p) => {
      try {
        return path.resolve(getPackDir(p.slug)).toLowerCase() === path.resolve(dir).toLowerCase();
      } catch {
        return false;
      }
    });
    if (byPath) {
      matchedSlugs.add(byPath.slug.toLowerCase());
      continue;
    }

    if (!folderHasImportableContent(dir)) {
      result.skipped.push({
        folder: folderName,
        reason: "Sem áudio nem presets",
      });
      continue;
    }

    try {
      const imported = await importPackFromArchive({
        sourceDirectory: dir,
        originalFileName: folderName,
        packName: folderName.replace(/[-_]+/g, " ").trim() || folderName,
      });
      matchedSlugs.add(imported.slug.toLowerCase());
      result.added.push({
        name: folderName,
        slug: imported.slug,
        sampleCount: imported.sampleCount,
      });
    } catch (err) {
      result.errors.push({
        folder: folderName,
        error: err instanceof Error ? err.message : "Falha ao importar",
      });
    }
  }

  if (removeMissing) {
    for (const pack of dbPacks) {
      if (matchedSlugs.has(pack.slug.toLowerCase())) continue;
      const packDir = getPackDir(pack.slug);
      if (fs.existsSync(packDir)) {
        // Pasta existe mas não estava na listagem (raro) — não remove
        continue;
      }
      try {
        await deletePack(pack.id);
        result.removed.push({ name: pack.name, slug: pack.slug });
      } catch (err) {
        result.errors.push({
          folder: pack.slug,
          error: err instanceof Error ? err.message : "Falha ao remover",
        });
      }
    }
  }

  return result;
}
