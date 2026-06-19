const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  const alters = [
    "ALTER TABLE users ADD COLUMN activeSessionId TEXT",
    "ALTER TABLE users ADD COLUMN lastLoginAt DATETIME",
    "ALTER TABLE users ADD COLUMN lastLoginDevice TEXT",
  ];
  for (const sql of alters) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("OK", sql);
    } catch (e) {
      console.log("SKIP", sql, e.message);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
