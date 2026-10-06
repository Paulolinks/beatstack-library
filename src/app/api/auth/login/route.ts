import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isLicenseServerMode, isManagerMode } from "@/lib/app-mode";
import {
  getLicenseCookieName,
  getLicenseServerUrl,
  loginViaLicenseServer,
} from "@/lib/auth/license-server";
import { prisma } from "@/lib/prisma";
import { isAllowedAdminEmail, resolveEffectiveRole } from "@/lib/auth/admin-policy";
import { normalizeEmail, verifyPassword } from "@/lib/auth/password";
import {
  hasLibraryAccess,
  hasManagerLicense,
  isManagerClientLogin,
  isSyncServiceLogin,
} from "@/lib/auth/product-access";
import {
  getSessionCookieName,
  getSessionMaxAge,
  isAuthDisabled,
  signSession,
} from "@/lib/auth/session";
import { useSecureAuthCookies } from "@/lib/auth/cookie-options";

async function completeLogin(
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    approved: boolean;
    licenseActivatedAt: Date | null;
  },
  deviceLabel: string | null,
  managerClient: boolean,
) {
  const sessionId = randomUUID();
  const now = new Date();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(managerClient
        ? { activeManagerSessionId: sessionId }
        : { activeSessionId: sessionId }),
      lastLoginAt: now,
      lastLoginDevice: deviceLabel,
      ...(managerClient && !user.licenseActivatedAt ? { licenseActivatedAt: now } : {}),
    },
  });

  const token = await signSession({
    userId: user.id,
    email: user.email,
    role: resolveEffectiveRole(user.email, user.role),
    approved: user.approved,
    sessionId,
    clientType: managerClient ? "manager" : "library",
  });

  const response = NextResponse.json({
    success: true,
    user: { email: user.email, name: user.name, role: user.role },
  });

  response.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: useSecureAuthCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAge(),
  });

  return response;
}

/** Sessão efêmera para Sync VPS — não altera activeSessionId do usuário no Library. */
async function completeSyncServiceLogin(user: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  approved: boolean;
}) {
  const sessionId = `sync:${randomUUID()}`;
  const token = await signSession({
    userId: user.id,
    email: user.email,
    role: resolveEffectiveRole(user.email, user.role),
    approved: user.approved,
    sessionId,
    clientType: "sync",
  });

  const response = NextResponse.json({
    success: true,
    user: { email: user.email, name: user.name, role: user.role },
    service: true,
  });

  response.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: useSecureAuthCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 h — só para upload/listagem
  });

  return response;
}

export async function POST(request: NextRequest) {
  if (isAuthDisabled()) {
    return NextResponse.json({ success: true, user: { email: "dev@local", role: "admin" } });
  }

  let body: { email?: string; password?: string; deviceLabel?: string; client?: string };
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

  if (isManagerMode()) {
    const result = await loginViaLicenseServer(email, password);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, pending: result.pending },
        { status: result.status },
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
      licenseServer: getLicenseServerUrl(),
    });

    response.cookies.set(getLicenseCookieName(), result.token, {
      httpOnly: true,
      secure: useSecureAuthCookies(),
      sameSite: "lax",
      path: "/",
      maxAge: getSessionMaxAge(),
    });

    return response;
  }

  const deviceLabel = body.deviceLabel?.trim().slice(0, 120) || null;
  const managerClient = isManagerClientLogin(body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      {
        error: "Esta conta não está registrada.",
        code: "NOT_REGISTERED",
      },
      { status: 404 },
    );
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  if (isLicenseServerMode()) {
    if (managerClient) {
      if (!hasManagerLicense(user.email, user.managerLicensed)) {
        return NextResponse.json(
          {
            error: "Licença do BeatStack Manager não ativa. Entre em contato para liberar o acesso.",
            pending: true,
          },
          { status: 403 },
        );
      }
      return completeLogin(user, deviceLabel, true);
    }

    if (!isAllowedAdminEmail(email)) {
      return NextResponse.json(
        { error: "Painel restrito ao administrador BeatStack Manager." },
        { status: 403 },
      );
    }

    return completeLogin(user, deviceLabel, false);
  }

  if (managerClient) {
    if (!hasManagerLicense(user.email, user.managerLicensed)) {
      return NextResponse.json(
        {
          error:
            "Licença do BeatStack Manager não ativa. Entre em contato para liberar o acesso ao app.",
          pending: true,
          product: "manager",
        },
        { status: 403 },
      );
    }
  } else if (!hasLibraryAccess(user.email, user.approved)) {
    return NextResponse.json(
      {
        error: "Sua conta ainda não foi aprovada. Aguarde o administrador liberar o acesso.",
        pending: true,
        product: "library",
      },
      { status: 403 },
    );
  }

  if (isSyncServiceLogin(body)) {
    const role = resolveEffectiveRole(user.email, user.role);
    if (role !== "admin") {
      return NextResponse.json(
        { error: "Sync VPS requer conta admin no Library" },
        { status: 403 },
      );
    }
    return completeSyncServiceLogin(user);
  }

  return completeLogin(user, deviceLabel, managerClient);
}
