import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getLegalStatusForUser } from "@/lib/legal/service";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal/versions";

export async function GET() {
  try {
    const session = await getSession();
    if (session) {
      const status = await getLegalStatusForUser(session.userId, session.email);
      return NextResponse.json(status);
    }

    return NextResponse.json({
      accepted: false,
      needsReaccept: true,
      termsVersion: null,
      privacyVersion: null,
      acceptedAt: null,
      currentTermsVersion: TERMS_VERSION,
      currentPrivacyVersion: PRIVACY_VERSION,
      authenticated: false,
    });
  } catch (err) {
    console.error("[GET /api/legal/status]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Note: getLocalLegalStatus is client-only; server uses DB only.
