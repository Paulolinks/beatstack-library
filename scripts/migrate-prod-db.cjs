/**
 * Adiciona colunas Manager/licença ausentes em prod.db (SQLite).
 * Uso no VPS: docker compose -p beatstack exec -T app node scripts/migrate-prod-db.cjs
 */
const { PrismaClient } = require("@prisma/client");

const ALTERS = [
  "ALTER TABLE users ADD COLUMN managerLicensed INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE users ADD COLUMN licensePurchasedAt DATETIME",
  "ALTER TABLE users ADD COLUMN licenseActivatedAt DATETIME",
  "ALTER TABLE users ADD COLUMN activeManagerSessionId TEXT",
  "ALTER TABLE users ADD COLUMN lastLoginAt DATETIME",
  "ALTER TABLE users ADD COLUMN lastLoginDevice TEXT",
];

async function main() {
  const prisma = new PrismaClient();
  for (const sql of ALTERS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("OK:", sql.split(" ADD ")[1]?.split(" ")[0] ?? sql);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate column") || msg.includes("already exists")) {
        console.log("skip (exists):", sql.split(" ADD ")[1]?.split(" ")[0]);
      } else {
        console.warn("warn:", msg);
      }
    }
  }
  await prisma.$disconnect();
  console.log("migrate-prod-db done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
