const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  const cols = await prisma.$queryRawUnsafe("PRAGMA table_info(users)");
  console.log(JSON.stringify(cols, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
