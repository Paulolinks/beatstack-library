import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];
  const name = process.argv[4] ?? "Administrador";

  if (!email || !password) {
    console.error("Uso: npx tsx scripts/create-admin.ts email@exemplo.com senha123 [Nome]");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Senha deve ter pelo menos 8 caracteres");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      name,
      role: "admin",
      approved: true,
    },
    update: {
      passwordHash,
      name,
      role: "admin",
      approved: true,
    },
  });

  console.log(`✅ Admin pronto: ${user.email} (${user.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
