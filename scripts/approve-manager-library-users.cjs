/**
 * Aprova no Library (approved=true) todos os usuários com licença Manager.
 * Rode no VPS: docker compose -p beatstack exec -T app node scripts/approve-manager-library-users.cjs
 */
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  const result = await prisma.user.updateMany({
    where: { managerLicensed: true, approved: false },
    data: { approved: true },
  });
  console.log(`OK — ${result.count} conta(s) aprovada(s) no Library`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
