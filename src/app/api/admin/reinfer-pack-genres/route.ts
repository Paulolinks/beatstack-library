import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inferGenresFromText } from "@/lib/pack-genres";

export async function POST() {
  const packs = await prisma.pack.findMany();
  let updated = 0;

  for (const pack of packs) {
    const fromName = inferGenresFromText(pack.name);
    const existingTags = (() => {
      try {
        return JSON.parse(pack.tags) as string[];
      } catch {
        return [];
      }
    })();

    const mergedTags = [...new Set([...fromName, ...existingTags, ...(pack.genre ? [pack.genre] : [])])];
    const genre = mergedTags[0] ?? pack.genre;

    if (genre || mergedTags.length > 0) {
      await prisma.pack.update({
        where: { id: pack.id },
        data: {
          genre: genre ?? pack.genre,
          tags: JSON.stringify(mergedTags.length ? mergedTags : existingTags),
        },
      });
      updated++;
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    message: `${updated} pack(s) com gênero atualizado a partir do nome`,
  });
}
