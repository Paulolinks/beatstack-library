const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS legal_acceptances (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT,
      email TEXT,
      termsVersion TEXT NOT NULL,
      privacyVersion TEXT NOT NULL,
      appVersion TEXT,
      os TEXT,
      ipAddress TEXT,
      source TEXT NOT NULL DEFAULT 'app',
      acceptedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS legal_acceptances_userId_idx ON legal_acceptances(userId)",
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS legal_acceptances_email_idx ON legal_acceptances(email)",
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS legal_acceptances_acceptedAt_idx ON legal_acceptances(acceptedAt)",
  );
  console.log("legal_acceptances ok");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
