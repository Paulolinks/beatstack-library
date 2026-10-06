import { NextRequest, NextResponse } from "next/server";
import { requireCloudConfig } from "@/lib/sync-vps/cloud-guard";
import { vpsFetch } from "@/lib/sync-vps/vps-client";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ packId: string }> },
) {
  const guard = requireCloudConfig();
  if (guard.error) return guard.error;
  const { packId } = await params;

  const res = await vpsFetch(guard.config, `/api/covers/${encodeURIComponent(packId)}`);
  if (!res.ok || !res.body) {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
