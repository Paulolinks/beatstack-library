import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { isUnsupportedAudioFile } from "@/lib/import/scan";
import { fromRelativeStoragePath, getPackDir, getPacksDir } from "@/lib/storage";

export type RemoveUnsupportedAudioResult = {
  deletedFiles: number;
  deletedSamples: number;
  updatedPacks: number;
  errors: Array<{ path: string; error: string }>;
};

function collectUnsupportedAudioFiles(rootDir: string): string[] {
  const found: string[] = [];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || entry.name.toLowerCase() === "__macosx") continue;
        walk(full);
      } else if (isUnsupportedAudioFile(entry.name)) {
        found.push(full);
      }
    }
  }

  walk(rootDir);
  return found;
}

async function deleteAiffSamplesForPack(packId: string): Promise<number> {
  const aiffSamples = await prisma.sample.findMany({
    where: {
      packId,
      OR: [
        { fileName: { endsWith: ".aif" } },
        { fileName: { endsWith: ".aiff" } },
        { fileName: { endsWith: ".AIF" } },
        { fileName: { endsWith: ".AIFF" } },
        { storagePath: { endsWith: ".aif" } },
        { storagePath: { endsWith: ".aiff" } },
      ],
    },
    select: { id: true, storagePath: true },
  });

  if (aiffSamples.length === 0) return 0;

  for (const sample of aiffSamples) {
    try {
      const abs = fromRelativeStoragePath(sample.storagePath);
      if (fs.existsSync(abs) && isUnsupportedAudioFile(path.basename(abs))) {
        fs.unlinkSync(abs);
      }
    } catch {
      /* ignore */
    }
  }

  await prisma.sample.deleteMany({
    where: { id: { in: aiffSamples.map((s) => s.id) } },
  });

  const count = await prisma.sample.count({ where: { packId } });
  await prisma.pack.update({
    where: { id: packId },
    data: { sampleCount: count },
  });

  return aiffSamples.length;
}

/**
 * Ao abrir um pack: apaga .aif/.aiff da pasta do pack e remove do índice.
 */
export async function removeUnsupportedAiffFromPack(options: {
  packId: string;
  slug: string;
}): Promise<RemoveUnsupportedAudioResult> {
  const result: RemoveUnsupportedAudioResult = {
    deletedFiles: 0,
    deletedSamples: 0,
    updatedPacks: 0,
    errors: [],
  };

  const packDir = getPackDir(options.slug);
  if (fs.existsSync(packDir)) {
    for (const filePath of collectUnsupportedAudioFiles(packDir)) {
      try {
        fs.unlinkSync(filePath);
        result.deletedFiles++;
      } catch (err) {
        result.errors.push({
          path: filePath,
          error: err instanceof Error ? err.message : "Falha ao apagar",
        });
      }
    }
  }

  result.deletedSamples = await deleteAiffSamplesForPack(options.packId);
  if (result.deletedFiles > 0 || result.deletedSamples > 0) {
    result.updatedPacks = 1;
  }

  return result;
}

/**
 * Apaga .aif/.aiff de todos os packs/ e remove do índice.
 */
export async function removeUnsupportedAiffFromPacks(): Promise<RemoveUnsupportedAudioResult> {
  const result: RemoveUnsupportedAudioResult = {
    deletedFiles: 0,
    deletedSamples: 0,
    updatedPacks: 0,
    errors: [],
  };

  const packsRoot = getPacksDir();
  for (const filePath of collectUnsupportedAudioFiles(packsRoot)) {
    try {
      fs.unlinkSync(filePath);
      result.deletedFiles++;
    } catch (err) {
      result.errors.push({
        path: filePath,
        error: err instanceof Error ? err.message : "Falha ao apagar",
      });
    }
  }

  const packs = await prisma.pack.findMany({ select: { id: true } });
  for (const pack of packs) {
    const deleted = await deleteAiffSamplesForPack(pack.id);
    if (deleted > 0) {
      result.deletedSamples += deleted;
      result.updatedPacks++;
    }
  }

  return result;
}
