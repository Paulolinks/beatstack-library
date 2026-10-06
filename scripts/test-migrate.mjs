import { PrismaClient } from "@prisma/client";
import path from "path";

const dbPath = path.join(process.env.APPDATA || "", "beatstack-manager", "manager.db");
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath.replace(/\\/g, "/")}` } },
});

// Inline migration (same as ensureManagerSchema)
const MIGRATIONS = [
  `ALTER TABLE "manager_settings" ADD COLUMN "preferredLocale" TEXT NOT NULL DEFAULT 'en'`,
];

for (const sql of MIGRATIONS) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    console.log("SKIP:", e.message?.slice(0, 80));
  }
}

const settings = await prisma.managerSetting.upsert({
  where: { id: "singleton" },
  create: { id: "singleton", preferredLocale: "en" },
  update: {},
});
console.log("managerSetting:", settings);

const folders = await prisma.favoriteFolder.findMany({ take: 3 });
console.log("folders sample:", folders.map((f) => f.name));

await prisma.$disconnect();
console.log("Migration test done.");
