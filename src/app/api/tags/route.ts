import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTagsJson } from "@/lib/utils";

export async function GET() {
  const samples = await prisma.sample.findMany({
    select: {
      tags: true,
      type: true,
      instrument: true,
      category: true,
      genre: true,
    },
  });

  const counts = new Map<string, number>();

  for (const sample of samples) {
    const tagSet = new Set<string>();
    for (const tag of parseTagsJson(sample.tags)) {
      tagSet.add(tag.toLowerCase());
    }
    for (const field of [sample.type, sample.instrument, sample.category, sample.genre]) {
      if (field) tagSet.add(field.toLowerCase());
    }
    for (const tag of tagSet) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const tags = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 80);

  return NextResponse.json({ tags });
}
