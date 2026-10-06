import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getCloudUserId } from "@/lib/cloud-favorites/route-helpers";
import { getItemForUser } from "@/lib/cloud-favorites/service";
import { fromRelativeStoragePath } from "@/lib/storage";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCloudUserId();
  if (typeof userId !== "string") return userId;
  const { id } = await params;
  try {
    const item = await getItemForUser(userId, id);
    if (!item.coverPath) return new NextResponse(null, { status: 404 });
    const filePath = fromRelativeStoragePath(item.coverPath);
    if (!fs.existsSync(filePath)) return new NextResponse(null, { status: 404 });
    return new NextResponse(fs.readFileSync(filePath), {
      headers: {
        "Content-Type": MIME[path.extname(filePath).toLowerCase()] ?? "image/jpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
