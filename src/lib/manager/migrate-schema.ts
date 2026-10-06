import { prisma } from "@/lib/prisma";

const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS "favorite_folders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isDefault" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "favorite_folders_slug_key" ON "favorite_folders"("slug")`,
  `CREATE TABLE IF NOT EXISTS "sample_favorite_folders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sampleId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sample_favorite_folders_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sample_favorite_folders_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "favorite_folders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "sample_favorite_folders_sampleId_folderId_key" ON "sample_favorite_folders"("sampleId", "folderId")`,
  `CREATE INDEX IF NOT EXISTS "sample_favorite_folders_folderId_idx" ON "sample_favorite_folders"("folderId")`,
  `CREATE TABLE IF NOT EXISTS "manager_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activeFavoriteFolderId" TEXT,
    "preferredLocale" TEXT NOT NULL DEFAULT 'en'
  )`,
  `ALTER TABLE "manager_settings" ADD COLUMN "preferredLocale" TEXT NOT NULL DEFAULT 'en'`,
  `ALTER TABLE "manager_settings" ADD COLUMN "activeFavoriteFolderId" TEXT`,
];

let schemaPromise: Promise<void> | null = null;

export async function ensureManagerSchema() {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    for (const sql of MIGRATIONS) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        /* coluna/tabela já existe */
      }
    }
  })();

  return schemaPromise;
}
