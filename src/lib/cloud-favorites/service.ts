import fs from "fs";
import path from "path";
import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import { fromRelativeStoragePath, getStorageRoot, toRelativeStoragePath } from "@/lib/storage";

const DEFAULT_FOLDER_NAME = "Favoritos";

export class CloudFavoriteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function favoritesRoot(userId: string): string {
  return path.join(getStorageRoot(), "favorites", userId);
}

function folderDir(userId: string, folderId: string): string {
  return path.join(favoritesRoot(userId), folderId);
}

function safeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 180) || "sample.wav";
}

/**
 * Hard link: mesmo arquivo do pack sem ocupar espaço extra; quando o pack é
 * excluído o conteúdo continua existindo por este link. Cópia se o link falhar.
 */
function linkOrCopy(source: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) return;
  try {
    fs.linkSync(source, dest);
  } catch {
    fs.copyFileSync(source, dest);
  }
}

function removeFileQuietly(relativePath: string | null | undefined): void {
  if (!relativePath) return;
  try {
    fs.rmSync(fromRelativeStoragePath(relativePath), { force: true });
  } catch (err) {
    console.error("[cloud-favorites] remover arquivo:", err);
  }
}

export async function ensureDefaultFolder(userId: string) {
  const existing = await prisma.cloudFavoriteFolder.findFirst({ where: { userId, isDefault: true } });
  if (existing) return existing;
  return prisma.cloudFavoriteFolder.upsert({
    where: { userId_slug: { userId, slug: "default" } },
    create: { userId, name: DEFAULT_FOLDER_NAME, slug: "default", isDefault: true },
    update: { isDefault: true },
  });
}

export async function listFolders(userId: string) {
  await ensureDefaultFolder(userId);
  const [folders, setting] = await Promise.all([
    prisma.cloudFavoriteFolder.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: { _count: { select: { items: true } } },
    }),
    prisma.cloudFavoriteSetting.findUnique({ where: { userId } }),
  ]);
  const activeId =
    setting?.activeFolderId && folders.some((f) => f.id === setting.activeFolderId)
      ? setting.activeFolderId
      : null;
  return {
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      isDefault: f.isDefault,
      itemCount: f._count.items,
    })),
    activeFavoriteFolderId: activeId,
  };
}

export async function createFolder(userId: string, rawName: string) {
  const name = rawName.trim().slice(0, 80);
  if (!name) throw new CloudFavoriteError("Nome da pasta obrigatório", 400);

  const folders = await prisma.cloudFavoriteFolder.findMany({ where: { userId } });
  const existing = folders.find((f) => f.name.trim().toLowerCase() === name.toLowerCase());
  if (existing) throw new CloudFavoriteError("Já existe uma pasta com este nome", 409);

  const base = slugify(name, { lower: true, strict: true }) || "pasta";
  let slug = base === "default" ? "pasta-default" : base;
  for (let i = 2; folders.some((f) => f.slug === slug); i++) slug = `${base}-${i}`;

  return prisma.cloudFavoriteFolder.create({ data: { userId, name, slug } });
}

export async function setActiveFolder(userId: string, folderId: string | null) {
  if (folderId) await getFolder(userId, folderId);
  await prisma.cloudFavoriteSetting.upsert({
    where: { userId },
    create: { userId, activeFolderId: folderId },
    update: { activeFolderId: folderId },
  });
}

export async function getFolder(userId: string, folderId: string) {
  const folder = await prisma.cloudFavoriteFolder.findFirst({ where: { id: folderId, userId } });
  if (!folder) throw new CloudFavoriteError("Pasta não encontrada", 404);
  return folder;
}

export async function deleteFolder(userId: string, folderId: string) {
  const folder = await getFolder(userId, folderId);
  if (folder.isDefault) throw new CloudFavoriteError("Não é possível excluir a pasta padrão", 400);
  await prisma.cloudFavoriteFolder.delete({ where: { id: folder.id } });
  await prisma.cloudFavoriteSetting.updateMany({
    where: { userId, activeFolderId: folder.id },
    data: { activeFolderId: null },
  });
  try {
    fs.rmSync(folderDir(userId, folder.id), { recursive: true, force: true });
  } catch (err) {
    console.error("[cloud-favorites] remover pasta:", err);
  }
  return folder;
}

/** Salva o sample na pasta: arquivo próprio + dados do sample/pack (não depende do pack existir). */
export async function addSampleToFolder(userId: string, folderId: string, sampleId: string) {
  const folder = await getFolder(userId, folderId);
  const existing = await prisma.cloudFavoriteItem.findFirst({ where: { folderId: folder.id, sampleId } });
  if (existing) return existing;

  const sample = await prisma.sample.findUnique({ where: { id: sampleId }, include: { pack: true } });
  if (!sample) throw new CloudFavoriteError("Sample não encontrado", 404);

  const source = fromRelativeStoragePath(sample.storagePath);
  if (!fs.existsSync(source)) throw new CloudFavoriteError("Arquivo do sample não existe no servidor", 404);

  const dest = path.join(folderDir(userId, folder.id), `${sample.id}__${safeFileName(sample.fileName)}`);
  linkOrCopy(source, dest);

  let coverPath: string | null = null;
  if (sample.pack.coverPath) {
    const coverSource = fromRelativeStoragePath(sample.pack.coverPath);
    if (fs.existsSync(coverSource)) {
      const coverDest = path.join(
        favoritesRoot(userId),
        "covers",
        `${sample.pack.id}${path.extname(coverSource).toLowerCase() || ".jpg"}`,
      );
      try {
        linkOrCopy(coverSource, coverDest);
        coverPath = toRelativeStoragePath(coverDest);
      } catch (err) {
        console.error("[cloud-favorites] capa:", err);
      }
    }
  }

  return prisma.cloudFavoriteItem.create({
    data: {
      folderId: folder.id,
      sampleId: sample.id,
      fileName: sample.fileName,
      displayName: sample.displayName,
      relativePath: sample.relativePath,
      filePath: toRelativeStoragePath(dest),
      coverPath,
      packName: sample.pack.name,
      packSlug: sample.pack.slug,
      producer: sample.pack.producer,
      durationMs: sample.durationMs,
      type: sample.type,
      instrument: sample.instrument,
      category: sample.category,
      genre: sample.genre ?? sample.pack.genre,
      bpm: sample.bpm,
      key: sample.key,
      tags: sample.tags,
      waveformPeaks: sample.waveformPeaks,
    },
  });
}

export async function removeItem(userId: string, folderId: string, where: { sampleId?: string; itemId?: string }) {
  const folder = await getFolder(userId, folderId);
  const item = await prisma.cloudFavoriteItem.findFirst({
    where: {
      folderId: folder.id,
      ...(where.itemId ? { id: where.itemId } : { sampleId: where.sampleId ?? "__none__" }),
    },
  });
  if (!item) return null;
  await prisma.cloudFavoriteItem.delete({ where: { id: item.id } });
  removeFileQuietly(item.filePath);
  return item;
}

export async function listSampleIds(userId: string, folderId: string): Promise<string[]> {
  const folder = await getFolder(userId, folderId);
  const rows = await prisma.cloudFavoriteItem.findMany({
    where: { folderId: folder.id, sampleId: { not: null } },
    select: { sampleId: true },
  });
  return rows.map((r) => r.sampleId!).filter(Boolean);
}

export async function listItems(userId: string, folderId: string) {
  const folder = await getFolder(userId, folderId);
  const items = await prisma.cloudFavoriteItem.findMany({
    where: { folderId: folder.id },
    orderBy: { addedAt: "desc" },
    include: { sample: { select: { packId: true } } },
  });
  return { folder, items };
}

export async function getItemForUser(userId: string, itemId: string) {
  const item = await prisma.cloudFavoriteItem.findFirst({
    where: { id: itemId, folder: { userId } },
  });
  if (!item) throw new CloudFavoriteError("Item não encontrado", 404);
  return item;
}

/** Importa as pastas que estavam só no computador (índice local do app desktop). */
export async function importLocalFolders(
  userId: string,
  folders: Array<{ name: string; isDefault?: boolean; sampleIds: string[] }>,
) {
  let added = 0;
  let skipped = 0;
  for (const local of folders.slice(0, 200)) {
    let folder;
    if (local.isDefault) {
      folder = await ensureDefaultFolder(userId);
    } else {
      const all = await prisma.cloudFavoriteFolder.findMany({ where: { userId } });
      folder =
        all.find((f) => f.name.trim().toLowerCase() === local.name.trim().toLowerCase()) ??
        (await createFolder(userId, local.name));
    }
    for (const sampleId of local.sampleIds.slice(0, 5000)) {
      try {
        await addSampleToFolder(userId, folder.id, sampleId);
        added++;
      } catch {
        skipped++;
      }
    }
  }
  return { added, skipped };
}
