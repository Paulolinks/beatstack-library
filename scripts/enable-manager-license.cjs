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
  const email = normalizeEmail(process.argv[2] ?? "");
  const password = process.argv[3];
  const name = process.argv[4] ?? "Paulo";

  if (!email || !password) {
    console.error("Uso: node scripts/enable-manager-license.cjs email senha [Nome]");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const role = assignableRole(email, "admin");
  const now = new Date();

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      name,
      role,
      approved: true,
      managerLicensed: true,
      licensePurchasedAt: now,
    },
    update: {
      passwordHash,
      name,
      role,
      approved: true,
      managerLicensed: true,
    },
  });

  console.log(
    "OK",
    user.email,
    "managerLicensed=",
    user.managerLicensed,
    "role=",
    user.role,
    "purchased=",
    user.licensePurchasedAt,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
