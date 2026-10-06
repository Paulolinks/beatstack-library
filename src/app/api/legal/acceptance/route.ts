import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { recordLegalAcceptance } from "@/lib/legal/service";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal/versions";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    let body: {
      termsVersion?: string;
      privacyVersion?: string;
      appVersion?: string;
      os?: string;
      source?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    if (body.termsVersion !== TERMS_VERSION || body.privacyVersion !== PRIVACY_VERSION) {
      return NextResponse.json(
        { error: "Versão dos termos desatualizada. Aceite novamente na tela legal." },
        { status: 409 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;

    const record = await recordLegalAcceptance({
      userId: session?.userId ?? null,
      email: session?.email ?? null,
      termsVersion: body.termsVersion,
      privacyVersion: body.privacyVersion,
      appVersion: body.appVersion ?? null,
      os: body.os ?? null,
      ipAddress: ip,
      source: body.source ?? (session ? "app" : "anonymous"),
    });

    return NextResponse.json({
      success: true,
      acceptedAt: record.acceptedAt.toISOString(),
      termsVersion: record.termsVersion,
      privacyVersion: record.privacyVersion,
    });
  } catch (err) {
    console.error("[POST /api/legal/acceptance]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
