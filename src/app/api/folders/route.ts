import { NextRequest, NextResponse } from "next/server";
import { cloudErrorResponse, getCloudUserId } from "@/lib/cloud-favorites/route-helpers";
import { createFolder, listFolders, setActiveFolder } from "@/lib/cloud-favorites/service";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getCloudUserId();
  if (typeof userId !== "string") return userId;
  try {
    return NextResponse.json(await listFolders(userId));
  } catch (err) {
    return cloudErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  const userId = await getCloudUserId();
  if (typeof userId !== "string") return userId;
  try {
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const folder = await createFolder(userId, body.name ?? "");
    return NextResponse.json({ ok: true, folder });
  } catch (err) {
    return cloudErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await getCloudUserId();
  if (typeof userId !== "string") return userId;
  try {
    const body = (await request.json().catch(() => ({}))) as { activeFavoriteFolderId?: string | null };
    await setActiveFolder(userId, body.activeFavoriteFolderId ?? null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return cloudErrorResponse(err);
  }
}
