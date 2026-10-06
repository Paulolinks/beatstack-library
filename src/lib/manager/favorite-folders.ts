import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import { ensureFavoriteFolderPath } from "@/lib/library-paths";

const DEFAULT_FOLDER_NAME = "Favoritos";

export async function ensureDefaultFavoriteFolder() {
  const existing = await prisma.favoriteFolder.findFirst({ where: { isDefault: true } });
  if (existing) {
    ensureFavoriteFolderPath(null);
    return existing;
  }

  ensureFavoriteFolderPath(null);

  return prisma.favoriteFolder.create({
    data: {
      name: DEFAULT_FOLDER_NAME,
      slug: "default",
      isDefault: true,
    },
  });
}

export function slugifyFolderName(name: string): string {
  const slug = slugify(name.trim(), { lower: true, strict: true });
  return slug || "pasta";
}

export async function getActiveFavoriteFolderId(): Promise<string | null> {
  const settings = await prisma.managerSetting.findUnique({ where: { id: "singleton" } });
  return settings?.activeFavoriteFolderId ?? null;
}

export async function getActiveFavoriteFolder() {
  const activeId = await getActiveFavoriteFolderId();
  if (!activeId) {
    return ensureDefaultFavoriteFolder();
  }
  const folder = await prisma.favoriteFolder.findUnique({ where: { id: activeId } });
  return folder ?? ensureDefaultFavoriteFolder();
}

export async function setActiveFavoriteFolderId(folderId: string | null) {
  await prisma.managerSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", activeFavoriteFolderId: folderId, preferredLocale: "en" },
    update: { activeFavoriteFolderId: folderId },
  });
}

export async function findFavoriteFolderByName(name: string) {
  const normalized = name.trim().toLowerCase();
  const folders = await prisma.favoriteFolder.findMany();
  return folders.find((f) => f.name.trim().toLowerCase() === normalized) ?? null;
}

export async function deleteFavoriteFolder(folderId: string) {
  const folder = await prisma.favoriteFolder.findUnique({ where: { id: folderId } });
  if (!folder) throw new Error("NOT_FOUND");
  if (folder.isDefault) throw new Error("CANNOT_DELETE_DEFAULT");

  const activeId = await getActiveFavoriteFolderId();
  if (activeId === folderId) {
    await setActiveFavoriteFolderId(null);
  }

  await prisma.favoriteFolder.delete({ where: { id: folderId } });
  return folder;
}

export async function addSampleToFavoriteFolder(sampleId: string, folderId: string) {
  return prisma.sampleFavoriteFolder.upsert({
    where: { sampleId_folderId: { sampleId, folderId } },
    create: { sampleId, folderId },
    update: { addedAt: new Date() },
  });
}

export async function removeSampleFromFavoriteFolder(sampleId: string, folderId: string) {
  await prisma.sampleFavoriteFolder.deleteMany({
    where: { sampleId, folderId },
  });
}
