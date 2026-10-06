import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isManagerMode } from "@/lib/app-mode";
import {
  getLicenseCookieName,
  logoutViaLicenseServer,
} from "@/lib/auth/license-server";
import { prisma } from "@/lib/prisma";
import { getSessionResult } from "@/lib/auth/get-session";
import { getSessionCookieName } from "@/lib/auth/session";
import { useSecureAuthCookies } from "@/lib/auth/cookie-options";

export async function POST() {
  const cookieStore = await cookies();

  if (isManagerMode()) {
    const licenseToken = cookieStore.get(getLicenseCookieName())?.value;
    await logoutViaLicenseServer(licenseToken);

    const response = NextResponse.json({ success: true });
    response.cookies.set(getLicenseCookieName(), "", {
      httpOnly: true,
      secure: useSecureAuthCookies(),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const { session, reason } = await getSessionResult();

  if (session && !session.userId.startsWith("license:")) {
    if (session.clientType === "manager") {
      await prisma.user.updateMany({
        where: { id: session.userId, activeManagerSessionId: session.sessionId },
        data: { activeManagerSessionId: null },
      });
    } else {
      await prisma.user.updateMany({
        where: { id: session.userId, activeSessionId: session.sessionId },
        data: { activeSessionId: null },
      });
    }
  }

  const response = NextResponse.json({
    success: true,
    replaced: reason === "SESSION_REPLACED",
  });

  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    secure: useSecureAuthCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
