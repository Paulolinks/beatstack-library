import { NextRequest, NextResponse } from "next/server";
import { requireCloudConfig } from "@/lib/sync-vps/cloud-guard";
import { vpsFetch } from "@/lib/sync-vps/vps-client";

export const runtime = "nodejs";

/** Proxy do áudio do VPS (o player do Manager não tem o cookie do VPS). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireCloudConfig();
  if (guard.error) return guard.error;
  const { id } = await params;

  const range = request.headers.get("range");
  const res = await vpsFetch(guard.config, `/api/audio/${encodeURIComponent(id)}`, {
    headers: range ? { Range: range } : undefined,
  });
  if (!res.ok || !res.body) {
    return NextResponse.json({ error: "Áudio indisponível no VPS" }, { status: res.status || 502 });
  }

  const headers = new Headers();
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = res.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", "private, max-age=3600");
  return new NextResponse(res.body, { status: res.status, headers });
}
