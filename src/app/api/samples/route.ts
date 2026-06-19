import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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
  const packId = searchParams.get("packId") || undefined;
  const tagsParam = searchParams.get("tags")?.trim();
  const tagFilters = tagsParam
    ? tagsParam
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : [];
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

  const andConditions: Prisma.SampleWhereInput[] = [];

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

  const metaFilter: Prisma.UserSampleMetaWhereInput = {};
  if (favorite) metaFilter.favorite = true;
  if (minRating) metaFilter.rating = { gte: minRating };
  if (rated) metaFilter.rating = { gte: 1 };
  if (downloaded) metaFilter.downloadedAt = { not: null };

  if (Object.keys(metaFilter).length > 0) {
    andConditions.push({ meta: metaFilter });
  }

  const samples = await prisma.sample.findMany({
    where: andConditions.length > 0 ? { AND: andConditions } : undefined,
    include: {
      pack: { select: { id: true, name: true, slug: true, coverPath: true, producer: true } },
      meta: true,
    },
    orderBy: downloaded
      ? { meta: { downloadedAt: "desc" } }
      : rated || minRating
        ? { meta: { rating: "desc" } }
        : { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ samples, count: samples.length });
}
