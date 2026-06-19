import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/get-session";
import { hashPassword, validatePassword } from "@/lib/auth/password";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  let body: { approved?: boolean; role?: string; name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const data: {
    approved?: boolean;
    role?: string;
    name?: string | null;
    passwordHash?: string;
  } = {};

  if (body.approved !== undefined) data.approved = body.approved;
  if (body.role !== undefined) data.role = body.role === "admin" ? "admin" : "user";
  if (body.name !== undefined) data.name = body.name.trim() || null;
  if (body.password) {
    const pwdError = validatePassword(body.password);
    if (pwdError) return NextResponse.json({ error: pwdError }, { status: 400 });
    data.passwordHash = await hashPassword(body.password);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  if (admin.userId === id) {
    return NextResponse.json({ error: "Você não pode remover sua própria conta" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
