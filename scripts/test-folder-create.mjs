import { PrismaClient } from "@prisma/client";
import path from "path";

const dbPath = path.join(process.env.APPDATA || "", "beatstack-manager", "manager.db");
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath.replace(/\\/g, "/")}` } },
});

try {
  const name = "Test Folder " + Date.now();
  const folder = await prisma.favoriteFolder.create({
    data: { name, slug: "test-" + Date.now(), isDefault: false },
  });
  console.log("Created:", folder.id, folder.name);
  await prisma.favoriteFolder.delete({ where: { id: folder.id } });
  console.log("Deleted test folder OK");
} catch (e) {
  console.error("FAIL:", e);
} finally {
  await prisma.$disconnect();
}
