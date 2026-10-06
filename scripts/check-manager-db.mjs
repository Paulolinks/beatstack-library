import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import os from "os";

const candidates = [
  path.join(process.env.APPDATA || "", "beatstack-manager", "manager.db"),
  path.join(process.env.APPDATA || "", "BeatStack Manager", "beatstack-manager", "manager.db"),
  path.join(process.env.LOCALAPPDATA || "", "BeatStack Manager", "beatstack-manager", "manager.db"),
];

for (const dbPath of candidates) {
  console.log("---", dbPath, fs.existsSync(dbPath) ? "EXISTS" : "missing");
  if (!fs.existsSync(dbPath)) continue;

  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath.replace(/\\/g, "/")}` } },
  });

  try {
    const tables = await prisma.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    console.log("tables:", tables.map((t) => t.name).join(", "));

    try {
      const folders = await prisma.favoriteFolder.findMany();
      console.log("favoriteFolder count:", folders.length);
    } catch (e) {
      console.log("favoriteFolder ERROR:", e.message);
    }

    try {
      const settings = await prisma.managerSetting.findUnique({ where: { id: "singleton" } });
      console.log("managerSetting:", settings);
    } catch (e) {
      console.log("managerSetting ERROR:", e.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}
