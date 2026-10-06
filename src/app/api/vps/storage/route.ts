import { NextRequest, NextResponse } from "next/server";
import { requireCloudConfig } from "@/lib/sync-vps/cloud-guard";
import { vpsFetch } from "@/lib/sync-vps/vps-client";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const guard = requireCloudConfig();
  if (guard.error) return guard.error;

  const refresh = request.nextUrl.searchParams.get("refresh") === "1" ? "?refresh=1" : "";
  try {
    const res = await vpsFetch(guard.config, `/api/admin/storage-usage${refresh}`);
    if (res.status === 404) {
      return NextResponse.json(
        { error: "O VPS ainda não tem essa função — atualize o Library no servidor." },
        { status: 501 },
      );
    }
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao consultar o VPS" },
      { status: 502 },
    );
  }
}
