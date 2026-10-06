import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { isManagerMode } from "@/lib/app-mode";
import { fromRelativeStoragePath } from "@/lib/storage";
import { copySampleToFavoriteDisk, removeSampleFromFavoriteDisk } from "@/lib/library-paths";
import { ensureManagerDbReady } from "@/lib/manager/init-db";
import {
  addSampleToFavoriteFolder,
  getActiveFavoriteFolder,
  removeSampleFromFavoriteFolder,
} from "@/lib/manager/favorite-folders";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let body: { rating?: number | null; favorite?: boolean };
    try {
      body = (await request.json()) as { rating?: number | null; favorite?: boolean };
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    if (body.rating !== undefined && body.rating !== null) {
      if (body.rating < 1 || body.rating > 5) {
        return NextResponse.json({ error: "Rating deve ser 1-5" }, { status: 400 });
      }
    }

    if (isManagerMode()) {
      await ensureManagerDbReady();
    }

    const sample = await prisma.sample.findUnique({
      where: { id },
      include: { pack: { select: { slug: true } } },
    });
    if (!sample) {
      return NextResponse.json({ error: "Sample não encontrado" }, { status: 404 });
    }

    let copiedTo: string | undefined;
    let favoriteFolderName: string | undefined;

    if (isManagerMode() && body.favorite !== undefined) {
      const folder = await getActiveFavoriteFolder();
      favoriteFolderName = folder.name;

      if (body.favorite) {
        await addSampleToFavoriteFolder(id, folder.id);
        try {
          const sourcePath = fromRelativeStoragePath(sample.storagePath);
          if (fs.existsSync(sourcePath)) {
            copiedTo = copySampleToFavoriteDisk(
              sourcePath,
              sample.pack.slug,
              sample.fileName,
              folder.slug,
            );
          }
        } catch (diskErr) {
          console.error("[meta] copy to favorites disk:", diskErr);
        }
      } else {
        await removeSampleFromFavoriteFolder(id, folder.id);
        removeSampleFromFavoriteDisk(sample.pack.slug, sample.fileName, folder.slug);
      }
    }

    let favoriteForMeta: boolean | undefined;
    if (isManagerMode() && body.favorite !== undefined) {
      const remaining = await prisma.sampleFavoriteFolder.count({ where: { sampleId: id } });
      favoriteForMeta = remaining > 0;
    } else if (body.favorite !== undefined) {
      favoriteForMeta = body.favorite;
    }

    const meta = await prisma.userSampleMeta.upsert({
      where: { sampleId: id },
      create: {
        sampleId: id,
        rating: body.rating ?? null,
        favorite: favoriteForMeta ?? false,
      },
      update: {
        ...(body.rating !== undefined ? { rating: body.rating } : {}),
        ...(favoriteForMeta !== undefined ? { favorite: favoriteForMeta } : {}),
      },
    });

    let responseMeta = meta;
    if (isManagerMode() && body.favorite !== undefined) {
      const folder = await getActiveFavoriteFolder();
      const inActive = await prisma.sampleFavoriteFolder.findUnique({
        where: { sampleId_folderId: { sampleId: id, folderId: folder.id } },
      });
      responseMeta = { ...meta, favorite: Boolean(inActive) };
    }

    return NextResponse.json({ meta: responseMeta, copiedTo, favoriteFolderName });
  } catch (err) {
    console.error("[PATCH /api/samples/meta]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
