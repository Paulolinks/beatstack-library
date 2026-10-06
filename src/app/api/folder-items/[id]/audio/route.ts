import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { cloudErrorResponse, getCloudUserId } from "@/lib/cloud-favorites/route-helpers";
import { getItemForUser } from "@/lib/cloud-favorites/service";
import { fromRelativeStoragePath } from "@/lib/storage";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCloudUserId();
  if (typeof userId !== "string") return userId;
  const { id } = await params;
  try {
    const item = await getItemForUser(userId, id);
    const filePath = fromRelativeStoragePath(item.filePath);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Arquivo ausente" }, { status: 404 });
    }
    const buffer = fs.readFileSync(filePath);
    const headers: Record<string, string> = {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "private, max-age=86400",
    };
    if (request.nextUrl.searchParams.get("download") === "1") {
      headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(item.fileName)}`;
    }
    return new NextResponse(buffer, { headers });
  } catch (err) {
    return cloudErrorResponse(err);
  }
}
