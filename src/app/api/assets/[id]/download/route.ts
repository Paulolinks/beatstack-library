import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import AdmZip from "adm-zip";
import { prisma } from "@/lib/prisma";
import { fromRelativeStoragePath } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const asset = await prisma.packAsset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ error: "Preset não encontrado" }, { status: 404 });
  }

  const sourcePath = fromRelativeStoragePath(asset.storagePath);
  if (!fs.existsSync(sourcePath)) {
    return NextResponse.json({ error: "Pasta de presets ausente" }, { status: 404 });
  }

  const safeName = asset.name.replace(/[<>:"/\\|?*]/g, "_");
  const zip = new AdmZip();
  zip.addLocalFolder(sourcePath);
  const buffer = zip.toBuffer();

  await prisma.userAssetMeta.upsert({
    where: { assetId: id },
    create: { assetId: id, downloadedAt: new Date() },
    update: { downloadedAt: new Date() },
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}.zip"`,
      "Content-Length": String(buffer.length),
    },
  });
}
