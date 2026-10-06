import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { isManagerMode } from "@/lib/app-mode";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  const type = searchParams.get("type") || undefined;
  const instrument = searchParams.get("instrument") || undefined;
  const category = searchParams.get("category") || undefined;
  const favorite = searchParams.get("favorite") === "true";
  const rated = searchParams.get("rated") === "true";
  const downloaded = searchParams.get("downloaded") === "true";
  const minRating = searchParams.get("minRating")
    ? parseInt(searchParams.get("minRating")!, 10)
    : undefined;
  const tagsParam = searchParams.get("tags")?.trim();
  const tagFilters = tagsParam
    ? tagsParam
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : [];
  const favoriteFolderId = searchParams.get("favoriteFolderId") || undefined;
  const forFolderFavorite = searchParams.get("forFolderFavorite") || undefined;
  const sampleIdsParam = searchParams.get("sampleIds")?.trim();
  const sampleIds = sampleIdsParam
    ? sampleIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : [];
  const packId = searchParams.get("packId") || undefined;
  const maxLimit = packId ? 5000 : 500;
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, maxLimit);
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

  const andConditions: Prisma.SampleWhereInput[] = [];

  if (sampleIds.length > 0) {
    andConditions.push({ id: { in: sampleIds } });
  }

  if (favoriteFolderId) {
    andConditions.push({
      favoriteEntries: { some: { folderId: favoriteFolderId } },
    });
  }

  if (packId) andConditions.push({ packId });
  if (type) andConditions.push({ type });
  if (instrument) andConditions.push({ instrument });
  if (category) andConditions.push({ category });

  if (q) {
    andConditions.push({
      OR: [
        { searchText: { contains: q } },
        { displayName: { contains: q } },
        { fileName: { contains: q } },
        { pack: { name: { contains: q } } },
        { pack: { producer: { contains: q } } },
      ],
    });
  }

  for (const tag of tagFilters) {
    andConditions.push({
      OR: [
        { searchText: { contains: tag } },
        { type: tag },
        { instrument: tag },
        { category: tag },
        { genre: tag },
        { tags: { contains: tag } },
      ],
    });
  }

  const useFolderScopedFavorite = isManagerMode() && Boolean(forFolderFavorite);

  const metaFilter: Prisma.UserSampleMetaWhereInput = {};
  if (favorite && !useFolderScopedFavorite && !favoriteFolderId && sampleIds.length === 0) {
    metaFilter.favorite = true;
  }
  if (minRating) metaFilter.rating = { gte: minRating };
  if (rated) metaFilter.rating = { gte: 1 };
  if (downloaded) metaFilter.downloadedAt = { not: null };

  if (Object.keys(metaFilter).length > 0) {
    andConditions.push({ meta: metaFilter });
  }

  const rows = await prisma.sample.findMany({
    where: andConditions.length > 0 ? { AND: andConditions } : undefined,
    include: {
      pack: { select: { id: true, name: true, slug: true, coverPath: true, producer: true } },
      meta: true,
      ...(useFolderScopedFavorite
        ? {
            favoriteEntries: {
              where: { folderId: forFolderFavorite! },
              select: { folderId: true },
            },
          }
        : {}),
    },
    orderBy: downloaded
      ? { meta: { downloadedAt: "desc" } }
      : rated || minRating
        ? { meta: { rating: "desc" } }
        : packId
          ? [{ type: "asc" }, { displayName: "asc" }]
          : { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  const samples = rows.map((s) => {
    const withEntries = s as typeof s & { favoriteEntries?: { folderId: string }[] };
    if (useFolderScopedFavorite) {
      const inFolder = (withEntries.favoriteEntries?.length ?? 0) > 0;
      const { favoriteEntries, ...rest } = withEntries;
      void favoriteEntries;
      return {
        ...rest,
        meta: {
          ...(s.meta ?? { sampleId: s.id, rating: null, favorite: false }),
          favorite: inFolder,
        },
      };
    }
    if (favoriteFolderId && isManagerMode()) {
      return {
        ...s,
        meta: {
          ...(s.meta ?? { sampleId: s.id, rating: null, favorite: false }),
          favorite: true,
        },
      };
    }
    if (sampleIds.length > 0) {
      return {
        ...s,
        meta: {
          ...(s.meta ?? { sampleId: s.id, rating: null, favorite: false }),
          favorite: true,
        },
      };
    }
    return s;
  });

  return NextResponse.json({ samples, count: samples.length });
}
