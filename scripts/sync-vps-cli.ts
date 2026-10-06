/**
 * CLI: envia packs locais (Manager/Library) para o VPS.
 */
import path from "path";
import os from "os";
import { PrismaClient } from "@prisma/client";

const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
if (!process.env.DATABASE_URL) {
  const dbPath = path.join(appData, "beatstack-manager", "manager.db").replace(/\\/g, "/");
  process.env.DATABASE_URL = `file:${dbPath}`;
}
if (!process.env.BEATSTACK_STORAGE_ROOT) {
  process.env.BEATSTACK_STORAGE_ROOT = path.join(appData, "beatstack-manager", "storage");
}
process.env.BEATSTACK_ALLOW_VPS_SYNC = "true";

import { loadSyncVpsConfig } from "../src/lib/sync-vps/config";
import { getDirectorySizeBytes } from "../src/lib/sync-vps/zip-pack";
import { getPackDir } from "../src/lib/storage";
import { getSyncQueueState, startSyncQueue } from "../src/lib/sync-vps/queue";

const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const testOne = args.includes("--test");
  const runAll = args.includes("--all");

  if (!testOne && !runAll) {
    console.log("Use --test (menor pack) ou --all (fila completa)");
    process.exit(1);
  }

  const config = loadSyncVpsConfig();
  if (!config) {
    console.error("❌ Configure SYNC_VPS_URL, SYNC_VPS_EMAIL, SYNC_VPS_PASSWORD");
    process.exit(1);
  }

  const packs = await prisma.pack.findMany({
    orderBy: { importedAt: "asc" },
    select: { id: true, slug: true, name: true, sampleCount: true },
  });

  console.log(`📦 ${packs.length} packs locais em ${process.env.BEATSTACK_STORAGE_ROOT ?? "./storage"}`);

  const withSize = packs.map((p) => ({
    ...p,
    sizeBytes: getDirectorySizeBytes(getPackDir(p.slug)),
  }));

  if (testOne) {
    const smallest = [...withSize].sort((a, b) => a.sizeBytes - b.sizeBytes)[0];
    if (!smallest) {
      console.error("❌ Nenhum pack local");
      process.exit(1);
    }
    console.log(`🧪 Teste: ${smallest.name} (${smallest.slug}) — ${(smallest.sizeBytes / 1024 / 1024).toFixed(1)} MB`);
    const result = await startSyncQueue([smallest.id]);
    if (!result.ok) {
      console.error("❌", result.error);
      process.exit(1);
    }
  } else if (runAll) {
    const result = await startSyncQueue(packs.map((p) => p.id));
    if (!result.ok) {
      console.error("❌", result.error);
      process.exit(1);
    }
    console.log(`🚀 Fila iniciada com ${packs.length} packs`);
  }

  while (true) {
    const q = getSyncQueueState();
    for (const item of q.items) {
      console.log(`  [${item.status}] ${item.name} — ${item.phase}${item.error ? ` — ${item.error}` : ""}`);
    }
    if (!q.running) {
      console.log(q.summary ?? "Concluído");
      break;
    }
    await sleep(5000);
  }
}

main()
  .catch((err) => {
    console.error("❌", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
