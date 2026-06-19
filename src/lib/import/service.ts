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
import {
  extractArchive,
  findCoverImage,
  copyCoverToPack,
  savePackCoverFromBuffer,
  inferPackNameFromArchive,
  inferPackNameFromFolderPaths,
  writeFolderFilesToDir,
} from "./extract";
import { scanAndEnrichAudio } from "./scan";
import { scanPresetBundles } from "./scan-presets";
import {
  buildDisplayName,
  buildSearchText,
  classifySample,
  inferPackMeta,
  inferGenreFromClassifications,
} from "./classify";

export interface ImportPackOptions {
  archivePath?: string;
  originalFileName: string;
  packName?: string;
  producer?: string;
  genre?: string;
  coverFile?: { buffer: Buffer; mimeType: string; fileName: string };
  folderFiles?: { buffer: Buffer; relativePath: string }[];
}

export interface ImportPackResult {
  packId: string;
  slug: string;
  sampleCount: number;
  presetCount: number;
  presetKinds: string[];
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
      inboxPath: options.archivePath ?? options.originalFileName,
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

    if (options.folderFiles?.length) {
      writeFolderFilesToDir(options.folderFiles, extractDir);
    } else if (options.archivePath) {
      await extractArchive(options.archivePath, extractDir);
    } else {
      throw new Error("Nenhum arquivo ou pasta enviado para importação");
    }

    await prisma.importJob.update({
      where: { id: job.id },
      data: { progress: 30 },
    });

    const defaultName = options.folderFiles?.length
      ? inferPackNameFromFolderPaths(options.folderFiles.map((f) => f.relativePath))
      : inferPackNameFromArchive(options.originalFileName);

    const folderName = options.packName || defaultName;
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
    if (options.coverFile) {
      const coverDest = savePackCoverFromBuffer(
        packDir,
        options.coverFile.buffer,
        options.coverFile.mimeType,
        options.coverFile.fileName,
      );
      coverRelative = toRelativeStoragePath(coverDest);
    } else if (coverSource) {
      const coverDest = copyCoverToPack(coverSource, packDir);
      coverRelative = toRelativeStoragePath(coverDest);
    }

    const audioFiles = await scanAndEnrichAudio(packDir);
    const presetBundles = scanPresetBundles(packDir);

    if (audioFiles.length === 0 && presetBundles.length === 0) {
      throw new Error(
        "Nenhum sample de áudio ou pasta de presets encontrada no pack",
      );
    }

    await prisma.importJob.update({
      where: { id: job.id },
      data: { progress: 70 },
    });

    const classifications = audioFiles.map((file) =>
      classifySample(file.relativePath, file.fileName),
    );
    const sampleGenre = inferGenreFromClassifications(classifications);
    const userGenre = options.genre?.trim() || undefined;
    const packGenre = userGenre || packMeta.genre || sampleGenre.genre;
    const packTags = [
      ...new Set([
        ...packMeta.tags,
        ...sampleGenre.tags,
        ...(userGenre ? [userGenre] : []),
        ...(packGenre ? [packGenre] : []),
      ]),
    ];

    const pack = await prisma.pack.create({
      data: {
        name: displayName,
        producer,
        slug,
        coverPath: coverRelative,
        sourceArchivePath: options.archivePath
          ? toRelativeStoragePath(options.archivePath)
          : null,
        sampleCount: audioFiles.length,
        presetCount: presetBundles.length,
        genre: packGenre,
        tags: JSON.stringify(packTags),
        published: true,
      },
    });

    if (audioFiles.length > 0) {
      await prisma.sample.createMany({
        data: audioFiles.map((file, i) => {
          const classification = classifications[i];
          const displaySampleName = buildDisplayName(displayName, file.fileName, classification);
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

    if (presetBundles.length > 0) {
      await prisma.packAsset.createMany({
        data: presetBundles.map((bundle) => {
          const tags = [
            "presets",
            ...(bundle.presetKind ? [bundle.presetKind] : []),
          ];
          return {
            packId: pack.id,
            name: bundle.name,
            relativePath: bundle.relativePath,
            storagePath: toRelativeStoragePath(bundle.absolutePath),
            assetType: "preset-folder",
            presetKind: bundle.presetKind,
            fileCount: bundle.fileCount,
            tags: JSON.stringify(tags),
            searchText: [displayName, producer, bundle.name, bundle.presetKind, ...tags]
              .filter(Boolean)
              .join(" ")
              .toLowerCase(),
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
      presetCount: presetBundles.length,
      presetKinds: [
        ...new Set(presetBundles.map((b) => b.presetKind).filter(Boolean)),
      ] as string[],
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
