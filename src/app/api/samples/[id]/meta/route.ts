import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    rating?: number | null;
    favorite?: boolean;
  };

  if (body.rating !== undefined && body.rating !== null) {
    if (body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: "Rating deve ser 1-5" }, { status: 400 });
    }
  }

  const sample = await prisma.sample.findUnique({ where: { id } });
  if (!sample) {
    return NextResponse.json({ error: "Sample não encontrado" }, { status: 404 });
  }

  const meta = await prisma.userSampleMeta.upsert({
    where: { sampleId: id },
    create: {
      sampleId: id,
      rating: body.rating ?? null,
      favorite: body.favorite ?? false,
    },
    update: {
      ...(body.rating !== undefined ? { rating: body.rating } : {}),
      ...(body.favorite !== undefined ? { favorite: body.favorite } : {}),
    },
  });

  return NextResponse.json({ meta });
}
