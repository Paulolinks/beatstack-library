import { AdminPacksClient } from "@/components/AdminPacksClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPacksPage() {
  const packs = await prisma.pack.findMany({
    orderBy: { importedAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      producer: true,
      coverPath: true,
      sampleCount: true,
    },
  });

  return <AdminPacksClient packs={packs} />;
}
