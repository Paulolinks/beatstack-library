import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { fromRelativeStoragePath } from "@/lib/storage";
import { ensureStagingDir } from "@/lib/staging";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sample = await prisma.sample.findUnique({ where: { id } });
  if (!sample) {
    return NextResponse.json({ error: "Sample não encontrado" }, { status: 404 });
  }

  const sourcePath = fromRelativeStoragePath(sample.storagePath);
  if (!fs.existsSync(sourcePath)) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 404 });
  }

  const stagingDir = ensureStagingDir();
  const safeName = sample.fileName.replace(/[<>:"/\\|?*]/g, "_");
  const destPath = path.join(stagingDir, safeName);

  fs.copyFileSync(sourcePath, destPath);

  await prisma.userSampleMeta.upsert({
    where: { sampleId: id },
    create: { sampleId: id, downloadedAt: new Date() },
    update: { downloadedAt: new Date() },
  });

  return NextResponse.json({
    success: true,
    path: destPath,
    fileName: safeName,
    message: `Copiado para pasta de staging do DAW`,
  });
}
