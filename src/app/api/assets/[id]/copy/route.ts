import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { fromRelativeStoragePath } from "@/lib/storage";
import { ensureLibraryFolder, sanitizePathSegment } from "@/lib/library-paths";
import { copyDirectoryRecursive } from "@/lib/import/scan-presets";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const asset = await prisma.packAsset.findUnique({
    where: { id },
    include: { pack: { select: { slug: true, name: true } } },
  });
  if (!asset) {
    return NextResponse.json({ error: "Preset não encontrado" }, { status: 404 });
  }

  const sourcePath = fromRelativeStoragePath(asset.storagePath);
  if (!fs.existsSync(sourcePath)) {
    return NextResponse.json({ error: "Pasta de presets ausente" }, { status: 404 });
  }

  const presetsRoot = ensureLibraryFolder("presets");
  const packDir = path.join(presetsRoot, sanitizePathSegment(asset.pack.slug));
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir, { recursive: true });
  }

  const safeName = asset.name.replace(/[<>:"/\\|?*]/g, "_");
  const destPath = path.join(packDir, safeName);

  if (fs.existsSync(destPath)) {
    fs.rmSync(destPath, { recursive: true, force: true });
  }

  copyDirectoryRecursive(sourcePath, destPath);

  await prisma.userAssetMeta.upsert({
    where: { assetId: id },
    create: { assetId: id, downloadedAt: new Date() },
    update: { downloadedAt: new Date() },
  });

  return NextResponse.json({
    success: true,
    path: destPath,
    folderName: safeName,
    fileCount: asset.fileCount,
    message: `Presets copiados para ${destPath}`,
  });
}
