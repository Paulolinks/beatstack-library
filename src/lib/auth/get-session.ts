import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  getSessionCookieName,
  isAuthDisabled,
  verifySessionToken,
  type SessionInvalidReason,
  type SessionPayload,
} from "@/lib/auth/session";

export type AuthUser = SessionPayload & { name: string | null };

export type SessionResult = {
  session: AuthUser | null;
  reason?: SessionInvalidReason;
};

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
      name: true,
      activeSessionId: true,
    },
  });

  if (!user || !user.approved) return { session: null };

  if (!user.activeSessionId || user.activeSessionId !== payload.sessionId) {
    return { session: null, reason: "SESSION_REPLACED" };
  }

  return {
    session: {
      userId: user.id,
      email: user.email,
      role: user.role,
      approved: user.approved,
      name: user.name,
      sessionId: payload.sessionId,
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
