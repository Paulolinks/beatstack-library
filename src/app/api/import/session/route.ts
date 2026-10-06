import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/get-session";
import { requireCurrentLegalAcceptance } from "@/lib/legal/require-acceptance";
import { createUploadSession } from "@/lib/import/upload-session";

export const runtime = "nodejs";

/** Inicia upload de pack em partes (arquivo por arquivo). */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const legalBlock = await requireCurrentLegalAcceptance();
  if (legalBlock) return legalBlock;

  let body: { packName?: string; producer?: string | null; genre?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const packName = body.packName?.trim();
  if (!packName) {
    return NextResponse.json({ error: "Informe packName" }, { status: 400 });
  }

  const session = createUploadSession({
    packName,
    producer: body.producer?.trim() || null,
    genre: body.genre?.trim() || null,
  });
  return NextResponse.json({ sessionId: session.id });
}
