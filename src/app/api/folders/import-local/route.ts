import { NextRequest, NextResponse } from "next/server";
import { cloudErrorResponse, getCloudUserId } from "@/lib/cloud-favorites/route-helpers";
import { importLocalFolders } from "@/lib/cloud-favorites/service";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const userId = await getCloudUserId();
  if (typeof userId !== "string") return userId;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      folders?: Array<{ name: string; isDefault?: boolean; sampleIds: string[] }>;
    };
    if (!Array.isArray(body.folders)) {
      return NextResponse.json({ error: "Informe folders" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...(await importLocalFolders(userId, body.folders)) });
  } catch (err) {
    return cloudErrorResponse(err);
  }
}
