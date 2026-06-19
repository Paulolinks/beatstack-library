const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "paulolinks16@gmail.com";
  return raw.split(",").map(normalizeEmail).filter(Boolean);
}

function assignableRole(email, requestedRole) {
  if (requestedRole === "admin" && getAdminEmails().includes(normalizeEmail(email))) {
    return "admin";
  }
  return "user";
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];
  const name = process.argv[4] ?? null;
  const requestedRole = process.argv[5];

  if (!email || !password) {
    console.error("Uso: node scripts/create-user.cjs email senha [Nome] [admin|user]");
    process.exit(1);
  }

  const role = assignableRole(email, requestedRole);
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name, role, approved: true },
    update: { passwordHash, name: name ?? undefined, approved: true, role },
  });
  console.log("OK", user.email, user.role, user.approved);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
