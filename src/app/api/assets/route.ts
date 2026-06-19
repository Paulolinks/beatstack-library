import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { fromRelativeStoragePath } from "@/lib/storage";
import { ensureStagingDir } from "@/lib/staging";
import { copyDirectoryRecursive } from "@/lib/import/scan-presets";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const packId = searchParams.get("packId") || undefined;
  const downloaded = searchParams.get("downloaded") === "true";

  const assets = await prisma.packAsset.findMany({
    where: {
      ...(packId ? { packId } : {}),
      ...(downloaded ? { meta: { downloadedAt: { not: null } } } : {}),
    },
    include: {
      pack: { select: { id: true, name: true, slug: true, coverPath: true, producer: true } },
      meta: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ assets, count: assets.length });
}
