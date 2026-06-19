import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const packs = await prisma.pack.findMany({
    where: { published: true },
    orderBy: { importedAt: "desc" },
    include: {
      _count: { select: { samples: true } },
    },
  });

  return NextResponse.json({ packs });
}
