import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSearchText, classifySample, inferGenreFromClassifications } from "@/lib/import/classify";

export async function POST() {
  const samples = await prisma.sample.findMany({
    include: {
      pack: { select: { name: true, producer: true } },
    },
  });

  let updated = 0;

  for (const sample of samples) {
    const classification = classifySample(sample.relativePath, sample.fileName);
    const searchText = buildSearchText(
      sample.pack.name,
      sample.pack.producer,
      sample.fileName,
      sample.displayName,
      classification,
    );

    await prisma.sample.update({
      where: { id: sample.id },
      data: {
        type: classification.type,
        instrument: classification.instrument,
        category: classification.category,
        genre: classification.genre,
        tags: JSON.stringify(classification.tags),
        searchText,
        ...(sample.bpm == null && classification.bpm != null ? { bpm: classification.bpm } : {}),
        ...(sample.key == null && classification.key != null ? { key: classification.key } : {}),
      },
    });
    updated++;
  }

  const packs = await prisma.pack.findMany({ include: { samples: { select: { genre: true } } } });
  let packsUpdated = 0;
  for (const pack of packs) {
    const classifications = pack.samples.map((s) => ({ genre: s.genre }));
    const { genre, tags } = inferGenreFromClassifications(
      classifications as Parameters<typeof inferGenreFromClassifications>[0],
    );
    if (genre) {
      await prisma.pack.update({
        where: { id: pack.id },
        data: { genre, tags: JSON.stringify(tags) },
      });
      packsUpdated++;
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    packsUpdated,
    message: `${updated} samples e ${packsUpdated} packs atualizados`,
  });
}
