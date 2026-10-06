import { NextRequest, NextResponse } from "next/server";
import { cloudErrorResponse, getCloudUserId } from "@/lib/cloud-favorites/route-helpers";
import { deleteFolder } from "@/lib/cloud-favorites/service";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCloudUserId();
  if (typeof userId !== "string") return userId;
  const { id } = await params;
  try {
    const folder = await deleteFolder(userId, id);
    return NextResponse.json({ ok: true, name: folder.name });
  } catch (err) {
    return cloudErrorResponse(err);
  }
}
