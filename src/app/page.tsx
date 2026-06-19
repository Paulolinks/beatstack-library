import { prisma } from "@/lib/prisma";
import { PackLibrary } from "@/components/PackLibrary";
import { uniquePresetKinds } from "@/lib/preset-kinds";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
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

  return <PackLibrary packs={packsWithPresets} isAdmin={session?.role === "admin"} />;
}
