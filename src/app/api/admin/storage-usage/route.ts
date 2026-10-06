import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/get-session";
import { getDiskSpace, getStorageUsage } from "@/lib/storage-usage";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Espaço em disco do servidor onde este app roda (no VPS: espaço do VPS). */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  try {
    if (request.nextUrl.searchParams.get("diskOnly") === "1") {
      return NextResponse.json(await getDiskSpace());
    }
    const force = request.nextUrl.searchParams.get("refresh") === "1";
    return NextResponse.json(await getStorageUsage(force));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao ler o disco" },
      { status: 500 },
    );
  }
}
