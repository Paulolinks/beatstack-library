import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isManagerMode } from "@/lib/app-mode";
import {
  fetchLicenseSession,
  getLicenseCookieName,
} from "@/lib/auth/license-server";
import {
  getSessionCookieName,
  isAuthDisabled,
  verifySessionToken,
  type SessionInvalidReason,
  type SessionPayload,
} from "@/lib/auth/session";
import { resolveEffectiveRole } from "@/lib/auth/admin-policy";
import { hasLibraryAccess, hasManagerLicense } from "@/lib/auth/product-access";

export type AuthUser = SessionPayload & { name: string | null };

export type SessionResult = {
  session: AuthUser | null;
  reason?: SessionInvalidReason;
};

async function resolveManagerLicenseSession(token: string | undefined): Promise<SessionResult> {
  if (!token) return { session: null };

  const data = await fetchLicenseSession(token);
  if (!data.user) {
    return {
      session: null,
      reason: data.reason === "SESSION_REPLACED" ? "SESSION_REPLACED" : "INVALID_TOKEN",
    };
  }

  return {
    session: {
      userId: `license:${data.user.email}`,
      email: data.user.email,
      role: resolveEffectiveRole(data.user.email, data.user.role),
      approved: true,
      name: data.user.name,
      sessionId: "license",
    },
  };
}

async function resolveSessionFromToken(token: string | undefined): Promise<SessionResult> {
  if (!token) return { session: null };

  const payload = await verifySessionToken(token);
  if (!payload) return { session: null, reason: "INVALID_TOKEN" };

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      role: true,
      approved: true,
      managerLicensed: true,
      name: true,
      activeSessionId: true,
      activeManagerSessionId: true,
    },
  });

  if (!user) return { session: null };

  if (payload.clientType === "sync") {
    const role = resolveEffectiveRole(user.email, user.role);
    if (role !== "admin") return { session: null, reason: "INVALID_TOKEN" };
    return {
      session: {
        userId: user.id,
        email: user.email,
        role,
        approved: user.approved,
        name: user.name,
        sessionId: payload.sessionId,
        clientType: "sync",
      },
    };
  }

  if (payload.clientType === "manager") {
    if (!hasManagerLicense(user.email, user.managerLicensed)) {
      return { session: null, reason: "INVALID_TOKEN" };
    }
  } else if (!hasLibraryAccess(user.email, user.approved)) {
    return { session: null };
  }

  /** Admin pode ficar logado no Library em vários computadores; demais contas: 1 sessão. */
  const adminMultiDevice =
    payload.clientType !== "manager" && resolveEffectiveRole(user.email, user.role) === "admin";
  const activeId =
    payload.clientType === "manager" ? user.activeManagerSessionId : user.activeSessionId;
  if (!adminMultiDevice && (!activeId || activeId !== payload.sessionId)) {
    return { session: null, reason: "SESSION_REPLACED" };
  }

  return {
    session: {
      userId: user.id,
      email: user.email,
      role:
        payload.clientType === "manager"
          ? "admin"
          : resolveEffectiveRole(user.email, user.role),
      approved: user.approved,
      name: user.name,
      sessionId: payload.sessionId,
      clientType: payload.clientType,
    },
  };
}

export async function getSessionResult(): Promise<SessionResult> {
  if (isAuthDisabled()) {
    return {
      session: {
        userId: "dev",
        email: "dev@local",
        role: "admin",
        approved: true,
        name: "Dev",
        sessionId: "dev",
      },
    };
  }

  const cookieStore = await cookies();

  if (isManagerMode()) {
    const licenseToken = cookieStore.get(getLicenseCookieName())?.value;
    return resolveManagerLicenseSession(licenseToken);
  }

  const token = cookieStore.get(getSessionCookieName())?.value;
  return resolveSessionFromToken(token);
}

export async function getSession(): Promise<AuthUser | null> {
  const { session } = await getSessionResult();
  return session;
}

export async function requireSession(): Promise<AuthUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireAdmin(): Promise<AuthUser> {
  const session = await requireSession();
  if (session.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return session;
}
