import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/get-session";
import { hashPassword, normalizeEmail, validatePassword } from "@/lib/auth/password";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      approved: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  let body: {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
    approved?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const pwdError = validatePassword(password);
  if (!email) {
    return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });
  }
  if (pwdError) {
    return NextResponse.json({ error: pwdError }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      name: body.name?.trim() || null,
      role: body.role === "admin" ? "admin" : "user",
      approved: body.approved ?? false,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      approved: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}
