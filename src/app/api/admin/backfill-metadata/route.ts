import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBpmKeyFromFileName } from "@/lib/sample-metadata";

export async function POST() {
  const samples = await prisma.sample.findMany();
  let updated = 0;

  for (const sample of samples) {
    const { bpm, key } = parseBpmKeyFromFileName(sample.fileName);
    const needsBpm = sample.bpm == null && bpm != null;
    const needsKey = sample.key == null && key != null;

    if (needsBpm || needsKey) {
      await prisma.sample.update({
        where: { id: sample.id },
        data: {
          ...(needsBpm ? { bpm } : {}),
          ...(needsKey ? { key } : {}),
        },
      });
      updated++;
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    message: `${updated} samples atualizados com BPM/Key do nome do arquivo`,
  });
}
