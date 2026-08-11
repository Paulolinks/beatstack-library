import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { isAuthDisabled } from "@/lib/auth/session";
import { getLegalStatusForUser } from "@/lib/legal/service";

export async function requireCurrentLegalAcceptance(): Promise<NextResponse | null> {
  // Manager offline / AUTH_DISABLED — não bloqueia import por termos.
  if (isAuthDisabled()) return null;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const status = await getLegalStatusForUser(session.userId, session.email);
  if (!status.accepted) {
    return NextResponse.json(
      {
        error: "Aceite os Termos de Uso e a Política de Privacidade antes de continuar.",
        code: "LEGAL_NOT_ACCEPTED",
        needsReaccept: true,
      },
      { status: 403 },
    );
  }

  return null;
}
