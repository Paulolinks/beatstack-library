import path from "path";
import os from "os";
import { PrismaClient } from "@prisma/client";

const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
const dbPath = path.join(appData, "beatstack-manager", "manager.db").replace(/\\/g, "/");
const storageRoot = path.join(appData, "beatstack-manager", "storage");

process.env.DATABASE_URL = `file:${dbPath}`;
process.env.BEATSTACK_STORAGE_ROOT = storageRoot;
process.env.BEATSTACK_ALLOW_VPS_SYNC = "true";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.pack.count();
  const smallest = await prisma.pack.findMany({
    orderBy: { sampleCount: "asc" },
    take: 3,
    select: { slug: true, name: true, sampleCount: true },
  });
  console.log("Packs:", count);
  for (const p of smallest) {
    console.log(` - ${p.name} (${p.sampleCount} samples) [${p.slug}]`);
  }
}

main()
  .finally(() => prisma.$disconnect());
