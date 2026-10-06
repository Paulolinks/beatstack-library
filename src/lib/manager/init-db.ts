import { prisma } from "@/lib/prisma";
import { ensureDefaultFavoriteFolder } from "@/lib/manager/favorite-folders";
import { ensureManagerSchema } from "@/lib/manager/migrate-schema";

let initPromise: Promise<void> | null = null;

export async function ensureManagerDbReady() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await ensureManagerSchema();
    await ensureDefaultFavoriteFolder();
    await prisma.managerSetting.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", preferredLocale: "en" },
      update: {},
    });
  })().catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
}
