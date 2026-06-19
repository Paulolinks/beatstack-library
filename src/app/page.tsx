import { prisma } from "@/lib/prisma";
import { PackLibrary } from "@/components/PackLibrary";
import { uniquePresetKinds } from "@/lib/preset-kinds";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const packs = await prisma.pack.findMany({
    where: { published: true },
    orderBy: { importedAt: "desc" },
    include: {
      assets: { select: { presetKind: true } },
    },
  });

  const packsWithPresets = packs.map(({ assets, ...pack }) => ({
    ...pack,
    presetKinds: uniquePresetKinds(assets),
  }));

  return <PackLibrary packs={packsWithPresets} />;
}
