import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Music2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PackSampleList } from "@/components/PackSampleList";

export const dynamic = "force-dynamic";

export default async function PackDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pack = await prisma.pack.findUnique({
    where: { slug },
    include: {
      samples: {
        orderBy: [{ type: "asc" }, { displayName: "asc" }],
        include: { meta: true },
      },
    },
  });

  if (!pack) notFound();

  const coverUrl = pack.coverPath ? `/api/covers/${pack.id}` : null;
  const types = [...new Set(pack.samples.map((s) => s.type).filter(Boolean))];

  return (
    <div>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos packs
      </Link>

      <div className="mb-8 flex gap-6">
        <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-xl bg-[#1a1a20]">
          {coverUrl ? (
            <Image src={coverUrl} alt={pack.name} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Music2 className="h-12 w-12 text-zinc-600" />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{pack.name}</h1>
          {pack.producer && (
            <p className="mt-1 text-zinc-400">{pack.producer}</p>
          )}
          <p className="mt-2 text-sm text-zinc-500">
            {pack.sampleCount} samples
            {pack.genre ? ` · ${pack.genre}` : ""}
          </p>
          {types.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {types.map((t) => (
                <Link
                  key={t}
                  href={`/search?q=${t}&packId=${pack.id}`}
                  className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs uppercase text-zinc-400 hover:bg-violet-600/30"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <PackSampleList initialSamples={pack.samples} pack={pack} />
    </div>
  );
}
