import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  getSessionCookieName,
  isAuthDisabled,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth/session";

export type AuthUser = SessionPayload & { name: string | null };

export async function getSession(): Promise<AuthUser | null> {
  if (isAuthDisabled()) {
    return {
      userId: "dev",
      email: "dev@local",
      role: "admin",
      approved: true,
      name: "Dev",
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload || !payload.approved) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, approved: true, name: true },
  });

  if (!user || !user.approved) return null;

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    approved: user.approved,
    name: user.name,
  };
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
