import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  const type = searchParams.get("type") || undefined;
  const instrument = searchParams.get("instrument") || undefined;
  const favorite = searchParams.get("favorite") === "true";
  const minRating = searchParams.get("minRating")
    ? parseInt(searchParams.get("minRating")!, 10)
    : undefined;
  const packId = searchParams.get("packId") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

  const samples = await prisma.sample.findMany({
    where: {
      ...(packId ? { packId } : {}),
      ...(type ? { type } : {}),
      ...(instrument ? { instrument } : {}),
      ...(q
        ? {
            OR: [
              { searchText: { contains: q } },
              { displayName: { contains: q } },
              { fileName: { contains: q } },
              { pack: { name: { contains: q } } },
              { pack: { producer: { contains: q } } },
            ],
          }
        : {}),
      ...(favorite || minRating
        ? {
            meta: {
              ...(favorite ? { favorite: true } : {}),
              ...(minRating ? { rating: { gte: minRating } } : {}),
            },
          }
        : {}),
    },
    include: {
      pack: { select: { id: true, name: true, slug: true, coverPath: true, producer: true } },
      meta: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ samples, count: samples.length });
}
