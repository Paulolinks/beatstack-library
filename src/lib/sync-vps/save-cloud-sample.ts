import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { prisma } from "@/lib/prisma";
import { getPackDir, toRelativeStoragePath, ensureStorageDirs } from "@/lib/storage";
import { copySampleToFavoriteDisk, removeSampleFromFavoriteDisk } from "@/lib/library-paths";
import { ensureManagerDbReady } from "@/lib/manager/init-db";
import {
  addSampleToFavoriteFolder,
  getActiveFavoriteFolder,
  removeSampleFromFavoriteFolder,
} from "@/lib/manager/favorite-folders";
import type { SyncVpsConfig } from "@/lib/sync-vps/config";
import { vpsFetch, type RemotePackSummary } from "@/lib/sync-vps/vps-client";

/** Marca packs criados só com samples salvos da nuvem (não reenviar ao VPS). */
export const CLOUD_SAVED_PACK_DESCRIPTION = "Salvos do VPS";

export type CloudSampleInput = {
  id: string;
  fileName: string;
  displayName?: string;
  relativePath?: string;
  durationMs?: number | null;
  type?: string | null;
  instrument?: string | null;
  category?: string | null;
  genre?: string | null;
  bpm?: number | null;
  key?: string | null;
  tags?: string;
  waveformPeaks?: string | null;
  searchText?: string | null;
};

export async function findLocalPackForRemote(pack: Pick<RemotePackSummary, "slug" | "name">) {
  const bySlug = await prisma.pack.findUnique({ where: { slug: pack.slug } });
  if (bySlug) return bySlug;
  const all = await prisma.pack.findMany({ select: { id: true, name: true } });
  const match = all.find((p) => p.name.trim().toLowerCase() === pack.name.trim().toLowerCase());
  return match ? prisma.pack.findUnique({ where: { id: match.id } }) : null;
}

function safeRelativePath(input: string): string {
  const parts = input
    .replace(/\\/g, "/")
    .split("/")
    .filter((p) => p && p !== "." && p !== "..");
  return parts.join("/") || "sample.wav";
}

async function downloadToFile(config: SyncVpsConfig, remotePath: string, dest: string) {
  const res = await vpsFetch(config, remotePath);
  if (!res.ok || !res.body) {
    throw new Error(`VPS respondeu ${res.status} ao baixar ${remotePath}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.download`;
  await pipeline(
    Readable.fromWeb(res.body as unknown as WebReadableStream<Uint8Array>),
    fs.createWriteStream(tmp),
  );
  fs.renameSync(tmp, dest);
}

async function ensureLocalPack(config: SyncVpsConfig, remote: RemotePackSummary) {
  const existing = await findLocalPackForRemote(remote);
  if (existing) return existing;

  ensureStorageDirs();
  const packDir = getPackDir(remote.slug);
  fs.mkdirSync(packDir, { recursive: true });

  let coverPath: string | null = null;
  if (remote.coverPath) {
    try {
      const dest = path.join(packDir, "cover.jpg");
      await downloadToFile(config, `/api/covers/${encodeURIComponent(remote.id)}`, dest);
      coverPath = toRelativeStoragePath(dest);
    } catch (err) {
      console.error("[save-cloud-sample] capa:", err);
    }
  }

  return prisma.pack.create({
    data: {
      name: remote.name,
      slug: remote.slug,
      producer: remote.producer,
      genre: remote.genre,
      coverPath,
      description: CLOUD_SAVED_PACK_DESCRIPTION,
      tags: JSON.stringify(remote.genre ? [remote.genre] : []),
      sampleCount: 0,
      published: true,
    },
  });
}

/**
 * Coração num sample do VPS: baixa o arquivo para o PC, cria o sample local
 * e coloca na pasta favorita ativa. Excluir o pack no VPS não afeta essa cópia.
 */
export async function saveCloudSampleToFavorites(
  config: SyncVpsConfig,
  remotePack: RemotePackSummary,
  remoteSample: CloudSampleInput,
) {
  await ensureManagerDbReady();
  const pack = await ensureLocalPack(config, remotePack);
  const relativePath = safeRelativePath(remoteSample.relativePath || remoteSample.fileName);
  const absPath = path.join(getPackDir(pack.slug), ...relativePath.split("/"));

  if (!fs.existsSync(absPath)) {
    await downloadToFile(config, `/api/audio/${encodeURIComponent(remoteSample.id)}`, absPath);
  }

  const storagePath = toRelativeStoragePath(absPath);
  let sample = await prisma.sample.findFirst({
    where: { packId: pack.id, OR: [{ relativePath }, { storagePath }] },
  });
  if (!sample) {
    sample = await prisma.sample.create({
      data: {
        packId: pack.id,
        fileName: remoteSample.fileName,
        displayName: remoteSample.displayName || remoteSample.fileName,
        storagePath,
        relativePath,
        durationMs: remoteSample.durationMs ?? null,
        type: remoteSample.type ?? null,
        instrument: remoteSample.instrument ?? null,
        category: remoteSample.category ?? null,
        genre: remoteSample.genre ?? null,
        bpm: remoteSample.bpm ?? null,
        key: remoteSample.key ?? null,
        tags: remoteSample.tags || "[]",
        waveformPeaks: remoteSample.waveformPeaks ?? null,
        searchText:
          remoteSample.searchText ??
          [remotePack.name, remotePack.producer, remoteSample.fileName].filter(Boolean).join(" ").toLowerCase(),
      },
    });
    const count = await prisma.sample.count({ where: { packId: pack.id } });
    await prisma.pack.update({ where: { id: pack.id }, data: { sampleCount: count } });
  }

  const folder = await getActiveFavoriteFolder();
  await addSampleToFavoriteFolder(sample.id, folder.id);
  await prisma.userSampleMeta.upsert({
    where: { sampleId: sample.id },
    create: { sampleId: sample.id, favorite: true },
    update: { favorite: true },
  });

  let copiedTo: string | undefined;
  try {
    copiedTo = copySampleToFavoriteDisk(absPath, pack.slug, sample.fileName, folder.slug);
  } catch (err) {
    console.error("[save-cloud-sample] cópia para Favoritos:", err);
  }

  return { localSampleId: sample.id, copiedTo, favoriteFolderName: folder.name };
}

/** Desfaz o coração: tira da pasta favorita ativa (o arquivo baixado no pack local fica). */
export async function unsaveCloudSample(
  remotePack: Pick<RemotePackSummary, "slug" | "name">,
  remoteSample: Pick<CloudSampleInput, "fileName" | "relativePath">,
) {
  await ensureManagerDbReady();
  const pack = await findLocalPackForRemote(remotePack);
  if (!pack) return { ok: true };
  const relativePath = safeRelativePath(remoteSample.relativePath || remoteSample.fileName);
  const sample = await prisma.sample.findFirst({ where: { packId: pack.id, relativePath } });
  if (!sample) return { ok: true };

  const folder = await getActiveFavoriteFolder();
  await removeSampleFromFavoriteFolder(sample.id, folder.id);
  removeSampleFromFavoriteDisk(pack.slug, sample.fileName, folder.slug);
  const remaining = await prisma.sampleFavoriteFolder.count({ where: { sampleId: sample.id } });
  await prisma.userSampleMeta.upsert({
    where: { sampleId: sample.id },
    create: { sampleId: sample.id, favorite: remaining > 0 },
    update: { favorite: remaining > 0 },
  });
  return { ok: true };
}
