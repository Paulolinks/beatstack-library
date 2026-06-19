import fs from "fs";
import path from "path";
import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import {
  ensureStorageDirs,
  getInboxDir,
  getPackDir,
  toRelativeStoragePath,
} from "@/lib/storage";
import { extractZip, findCoverImage, copyCoverToPack, inferPackNameFromArchive } from "./extract";
import { scanAndEnrichAudio } from "./scan";
import {
  buildDisplayName,
  buildSearchText,
  classifySample,
  inferPackMeta,
} from "./classify";

export interface ImportPackOptions {
  archivePath: string;
  originalFileName: string;
  packName?: string;
  producer?: string;
}

export interface ImportPackResult {
  packId: string;
  slug: string;
  sampleCount: number;
  jobId: string;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base, { lower: true, strict: true }) || "pack";
  let candidate = slug;
  let i = 1;
  while (await prisma.pack.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${i++}`;
  }
  return candidate;
}

export async function importPackFromArchive(
  options: ImportPackOptions,
): Promise<ImportPackResult> {
  ensureStorageDirs();

  const job = await prisma.importJob.create({
    data: {
      fileName: options.originalFileName,
      inboxPath: options.archivePath,
      status: "PROCESSING",
      progress: 5,
    },
  });

  try {
    const extractDir = path.join(getInboxDir(), `extract-${job.id}`);
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
    fs.mkdirSync(extractDir, { recursive: true });

    await prisma.importJob.update({
      where: { id: job.id },
      data: { progress: 15 },
    });

    extractZip(options.archivePath, extractDir);

    await prisma.importJob.update({
      where: { id: job.id },
      data: { progress: 30 },
    });

    const folderName = options.packName || inferPackNameFromArchive(options.originalFileName);
    const packMeta = inferPackMeta(folderName);
    const displayName = options.packName || packMeta.name;
    const producer = options.producer || packMeta.producer;
    const slug = await uniqueSlug(displayName);

    const packDir = getPackDir(slug);
    if (fs.existsSync(packDir)) {
      fs.rmSync(packDir, { recursive: true, force: true });
    }
    fs.cpSync(extractDir, packDir, { recursive: true });

    await prisma.importJob.update({
      where: { id: job.id },
      data: { progress: 45 },
    });

    const coverSource = findCoverImage(packDir);
    let coverRelative: string | null = null;
    if (coverSource) {
      const coverDest = copyCoverToPack(coverSource, packDir);
      coverRelative = toRelativeStoragePath(coverDest);
    }

    const audioFiles = await scanAndEnrichAudio(packDir);

    await prisma.importJob.update({
      where: { id: job.id },
      data: { progress: 70 },
    });

    const pack = await prisma.pack.create({
      data: {
        name: displayName,
        producer,
        slug,
        coverPath: coverRelative,
        sourceArchivePath: toRelativeStoragePath(options.archivePath),
        sampleCount: audioFiles.length,
        genre: packMeta.genre,
        tags: JSON.stringify(packMeta.tags),
        published: true,
      },
    });

    if (audioFiles.length > 0) {
      await prisma.sample.createMany({
        data: audioFiles.map((file) => {
          const classification = classifySample(file.relativePath, file.fileName);
          const displaySampleName = buildDisplayName(
            displayName,
            file.fileName,
            classification,
          );
          return {
            packId: pack.id,
            fileName: file.fileName,
            displayName: displaySampleName,
            storagePath: toRelativeStoragePath(file.absolutePath),
            relativePath: file.relativePath,
            durationMs: file.durationMs,
            type: classification.type,
            instrument: classification.instrument,
            category: classification.category,
            genre: classification.genre,
            bpm: classification.bpm,
            key: classification.key,
            tags: JSON.stringify(classification.tags),
            waveformPeaks: JSON.stringify(file.waveformPeaks),
            searchText: buildSearchText(
              displayName,
              producer,
              file.fileName,
              displaySampleName,
              classification,
            ),
          };
        }),
      });
    }

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        progress: 100,
        packId: pack.id,
      },
    });

    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }

    return {
      packId: pack.id,
      slug: pack.slug,
      sampleCount: audioFiles.length,
      jobId: job.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido na importação";
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: message },
    });
    throw error;
  }
}

export async function deletePack(packId: string): Promise<void> {
  const pack = await prisma.pack.findUnique({ where: { id: packId } });
  if (!pack) return;

  const packDir = getPackDir(pack.slug);
  if (fs.existsSync(packDir)) {
    fs.rmSync(packDir, { recursive: true, force: true });
  }

  await prisma.pack.delete({ where: { id: packId } });
}
