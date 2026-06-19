import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const email = process.argv[2] ?? "admin@gmail.com";
const password = process.argv[3] ?? "admin123";
const name = process.argv[4] ?? "Admin";

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 12);

await prisma.user.upsert({
  where: { email },
  create: { email, passwordHash, name, role: "admin", approved: true },
  update: { passwordHash, name, role: "admin", approved: true },
});

console.log(`Admin pronto: ${email}`);
await prisma.$disconnect();
