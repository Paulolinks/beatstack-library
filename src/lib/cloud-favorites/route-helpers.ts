import { NextResponse } from "next/server";
import { isManagerMode } from "@/lib/app-mode";
import { getSession } from "@/lib/auth/get-session";
import { CloudFavoriteError } from "@/lib/cloud-favorites/service";

/** Pastas na nuvem são do Library (VPS); o Manager usa as pastas locais dele. */
export async function getCloudUserId(): Promise<string | NextResponse> {
  if (isManagerMode()) {
    return NextResponse.json({ error: "Use as pastas do Manager" }, { status: 404 });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return session.userId;
}

export function cloudErrorResponse(err: unknown): NextResponse {
  if (err instanceof CloudFavoriteError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[cloud-favorites]", err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Erro interno" },
    { status: 500 },
  );
}
