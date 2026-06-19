import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { fromRelativeStoragePath } from "@/lib/storage";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".aiff": "audio/aiff",
  ".aif": "audio/aiff",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sample = await prisma.sample.findUnique({ where: { id } });
  if (!sample) {
    return NextResponse.json({ error: "Sample não encontrado" }, { status: 404 });
  }

  const filePath = fromRelativeStoragePath(sample.storagePath);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Arquivo de áudio ausente" }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const buffer = fs.readFileSync(filePath);
  const safeName = sample.fileName.replace(/[<>:"/\\|?*]/g, "_");

  await prisma.userSampleMeta.upsert({
    where: { sampleId: id },
    create: { sampleId: id, downloadedAt: new Date() },
    update: { downloadedAt: new Date() },
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
