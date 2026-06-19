const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];
  const name = process.argv[4] ?? null;
  const role = process.argv[5] === "admin" ? "admin" : "user";

  if (!email || !password) {
    console.error("Uso: node scripts/create-user.cjs email senha [Nome] [admin|user]");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name, role, approved: true },
    update: { passwordHash, name: name ?? undefined, approved: true },
  });
  console.log("OK", user.email, user.role, user.approved);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
