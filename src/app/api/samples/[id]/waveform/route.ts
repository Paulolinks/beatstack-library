import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { peaks: number[] };

  if (!Array.isArray(body.peaks) || body.peaks.length === 0) {
    return NextResponse.json({ error: "Peaks inválidos" }, { status: 400 });
  }

  const sample = await prisma.sample.findUnique({ where: { id } });
  if (!sample) {
    return NextResponse.json({ error: "Sample não encontrado" }, { status: 404 });
  }

  await prisma.sample.update({
    where: { id },
    data: { waveformPeaks: JSON.stringify(body.peaks) },
  });

  return NextResponse.json({ success: true });
}
