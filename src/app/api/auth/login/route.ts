import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, validatePassword, verifyPassword } from "@/lib/auth/password";
import {
  getSessionCookieName,
  getSessionMaxAge,
  isAuthDisabled,
  signSession,
} from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  if (isAuthDisabled()) {
    return NextResponse.json({ success: true, user: { email: "dev@local", role: "admin" } });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  if (!user.approved) {
    return NextResponse.json(
      {
        error: "Sua conta ainda não foi aprovada. Aguarde o administrador liberar o acesso.",
        pending: true,
      },
      { status: 403 },
    );
  }

  const token = await signSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    approved: user.approved,
  });

  const response = NextResponse.json({
    success: true,
    user: { email: user.email, name: user.name, role: user.role },
  });

  response.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAge(),
  });

  return response;
}
