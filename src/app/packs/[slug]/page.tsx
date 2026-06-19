import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/get-session";
import { PackSampleList } from "@/components/PackSampleList";
import { PackPageHeader } from "@/components/PackPageHeader";
import { PresetFolderList } from "@/components/PresetFolderList";

export const dynamic = "force-dynamic";

export default async function PackDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const pack = await prisma.pack.findUnique({
    where: { slug },
    include: {
      samples: {
        orderBy: [{ type: "asc" }, { displayName: "asc" }],
        include: { meta: true },
      },
      assets: {
        orderBy: { name: "asc" },
        include: { meta: true },
      },
    },
  });

  if (!pack) notFound();

  const types = [...new Set(pack.samples.map((s) => s.type).filter(Boolean))] as string[];

  return (
    <div>
      <PackPageHeader
        pack={{
          id: pack.id,
          name: pack.name,
          slug: pack.slug,
          producer: pack.producer,
          coverPath: pack.coverPath,
          sampleCount: pack.sampleCount,
          presetCount: pack.presetCount,
          genre: pack.genre,
        }}
        types={types}
        isAdmin={session?.role === "admin"}
      />
      <PresetFolderList
        assets={pack.assets.map((a) => ({
          ...a,
          pack: {
            id: pack.id,
            name: pack.name,
            slug: pack.slug,
            coverPath: pack.coverPath,
            producer: pack.producer,
          },
        }))}
      />
      <PackSampleList initialSamples={pack.samples} pack={pack} />
    </div>
  );
}
