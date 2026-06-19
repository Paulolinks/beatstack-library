import { NextResponse } from "next/server";
import { getSessionResult } from "@/lib/auth/get-session";
import { isAuthDisabled } from "@/lib/auth/session";

export async function GET() {
  const { session, reason } = await getSessionResult();

  if (!session) {
    return NextResponse.json({
      user: null,
      reason: reason ?? null,
    });
  }

  return NextResponse.json({
    user: {
      email: session.email,
      name: session.name,
      role: session.role,
    },
    authDisabled: isAuthDisabled(),
  });
}
