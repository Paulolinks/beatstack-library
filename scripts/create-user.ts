import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];
  const name = process.argv[4] ?? null;
  const role = process.argv[5] === "admin" ? "admin" : "user";

  if (!email || !password) {
    console.error(
      "Uso: npx tsx scripts/create-user.ts email@exemplo.com senha [Nome] [admin|user]",
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      name,
      role,
      approved: true,
    },
    update: {
      passwordHash,
      name: name ?? undefined,
      approved: true,
    },
  });

  console.log(`✅ Usuário pronto: ${user.email} (${user.role}, aprovado)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
