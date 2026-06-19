import { SignJWT, jwtVerify } from "jose";

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  approved: boolean;
  sessionId: string;
}

export type SessionInvalidReason = "SESSION_REPLACED" | "INVALID_TOKEN";

const COOKIE_NAME = "beatstack_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 dias

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "dev-beatstack-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

export function getSessionMaxAge(): number {
  return MAX_AGE_SEC;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.userId;
    const email = payload.email;
    const role = payload.role;
    const approved = payload.approved;
    const sessionId = payload.sessionId;
    if (
      typeof userId !== "string" ||
      typeof email !== "string" ||
      typeof sessionId !== "string"
    ) {
      return null;
    }
    return {
      userId,
      email,
      role: typeof role === "string" ? role : "user",
      approved: approved === true,
      sessionId,
    };
  } catch {
    return null;
  }
}

export function isAuthDisabled(): boolean {
  return process.env.AUTH_DISABLED === "true";
}
