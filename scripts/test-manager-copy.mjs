import fs from "fs";
import path from "path";
import os from "os";

const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const dataDir = path.join(appData, "beatstack-manager");
const dbPath = path.join(dataDir, "manager.db");
const storageRoot = path.join(dataDir, "storage");

console.log("DB:", dbPath, fs.existsSync(dbPath) ? "OK" : "MISSING");
console.log("Storage:", storageRoot, fs.existsSync(storageRoot) ? "OK" : "MISSING");

if (!fs.existsSync(dbPath)) {
  console.error("Manager DB not found");
  process.exit(1);
}

process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, "/")}`;
process.env.BEATSTACK_STORAGE_ROOT = storageRoot;
process.env.BEATSTACK_APP_MODE = "manager";

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

const sample = await prisma.sample.findFirst({
  include: { pack: { select: { slug: true, name: true } } },
});

if (!sample) {
  console.error("No samples in DB");
  process.exit(1);
}

const sourcePath = path.join(storageRoot, sample.storagePath.replace(/\//g, path.sep));
console.log("\nSample:", sample.fileName);
console.log("storagePath:", sample.storagePath);
console.log("Source exists:", fs.existsSync(sourcePath), sourcePath);

const documents = path.join(process.env.USERPROFILE || os.homedir(), "Documents");
const destRoot = path.join(documents, "BeatStack Manager", "Downloads");
const packDir = path.join(destRoot, sample.pack.slug.replace(/[<>:"/\\|?*]/g, "_").trim() || "pack");
const safeName = sample.fileName.replace(/[<>:"/\\|?*]/g, "_");
const destPath = path.join(packDir, safeName);

try {
  if (!fs.existsSync(packDir)) fs.mkdirSync(packDir, { recursive: true });
  fs.copyFileSync(sourcePath, destPath);
  console.log("\nCopy OK:", destPath);
} catch (err) {
  console.error("\nCopy FAILED:", err.message);
  process.exit(1);
}

await prisma.$disconnect();
