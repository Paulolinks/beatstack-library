/**
 * Teste: importa pasta já extraída em D:\Beat Stack Library\packs\...
 * Uso: node --import tsx scripts/test-localpath-import.mjs
 */
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";

const storageRoot = "D:\\Beat Stack Library";
const sourceName = "Shadow Samples - Baile Bass";
const sourceDirectory = path.join(storageRoot, "packs", sourceName);
const dbPath = path.join(
  process.env.APPDATA || "",
  "beatstack-manager",
  "manager.db",
);
const configPath = path.join(
  process.env.APPDATA || "",
  "beatstack-manager",
  "storage-config.json",
);

if (!fs.existsSync(sourceDirectory)) {
  console.error("Pasta não encontrada:", sourceDirectory);
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error("manager.db não encontrado:", dbPath);
  process.exit(1);
}

process.env.BEATSTACK_APP_MODE = "manager";
process.env.NEXT_PUBLIC_BEATSTACK_APP_MODE = "manager";
process.env.AUTH_DISABLED = "true";
process.env.BEATSTACK_STORAGE_ROOT = storageRoot;
process.env.BEATSTACK_STORAGE_CONFIG = configPath;
process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, "/")}`;

console.log("Storage:", storageRoot);
console.log("Source:", sourceDirectory);
console.log("DB:", process.env.DATABASE_URL);

const { importPackFromArchive } = await import("../src/lib/import/service.ts");

const t0 = Date.now();
try {
  const result = await importPackFromArchive({
    sourceDirectory,
    originalFileName: sourceName,
    packName: "Shadow Samples Baile Bass",
    producer: "Shadow Samples",
    genre: "dubstep",
  });
  console.log("OK em", Math.round((Date.now() - t0) / 1000), "s");
  console.log(result);
} catch (err) {
  console.error("FALHOU em", Math.round((Date.now() - t0) / 1000), "s");
  console.error(err);
  process.exit(1);
}
