import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionResult } from "@/lib/auth/get-session";
import { getSessionCookieName } from "@/lib/auth/session";

export async function POST() {
  const { session, reason } = await getSessionResult();

  if (session) {
    await prisma.user.updateMany({
      where: { id: session.userId, activeSessionId: session.sessionId },
      data: { activeSessionId: null },
    });
  }

  const response = NextResponse.json({
    success: true,
    replaced: reason === "SESSION_REPLACED",
  });

  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
