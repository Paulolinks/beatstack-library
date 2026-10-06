import { NextRequest, NextResponse } from "next/server";
import { cloudErrorResponse, getCloudUserId } from "@/lib/cloud-favorites/route-helpers";
import { listSampleIds } from "@/lib/cloud-favorites/service";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCloudUserId();
  if (typeof userId !== "string") return userId;
  const { id } = await params;
  try {
    return NextResponse.json({ sampleIds: await listSampleIds(userId, id) });
  } catch (err) {
    return cloudErrorResponse(err);
  }
}
