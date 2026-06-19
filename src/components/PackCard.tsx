"use client";

import Link from "next/link";
import Image from "next/image";
import { Music2, SlidersHorizontal } from "lucide-react";
import { PresetKindBadges } from "@/components/PresetKindBadges";

export interface PackCardData {
  id: string;
  name: string;
  slug: string;
  producer: string | null;
  coverPath: string | null;
  sampleCount: number;
  presetCount: number;
  presetKinds?: string[];
  genre: string | null;
}

export function PackCard({
  pack,
  tags = [],
}: {
  pack: PackCardData;
  tags?: string[];
}) {
  const coverUrl = pack.coverPath ? `/api/covers/${pack.id}` : null;
  const presetKinds = pack.presetKinds ?? [];

  return (
    <Link
      href={`/packs/${pack.slug}`}
      className="group overflow-hidden rounded-xl border border-white/10 bg-[#141418] transition hover:border-violet-500/40 hover:bg-[#18181d]"
    >
      <div className="relative aspect-square bg-[#1a1a20]">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={pack.name}
            fill
            className="object-cover transition group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Music2 className="h-12 w-12 text-zinc-600" />
          </div>
        )}
        {presetKinds.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2">
            <PresetKindBadges kinds={presetKinds} />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate font-medium text-zinc-100">{pack.name}</h3>
        {pack.producer && (
          <p className="truncate text-sm text-zinc-500">{pack.producer}</p>
        )}
        <p className="mt-1 text-xs text-zinc-600">
          {pack.sampleCount} samples
          {pack.presetCount > 0 && (
            <span className="text-amber-600/80">
              {" "}
              · <SlidersHorizontal className="mr-0.5 inline h-3 w-3" />
              {pack.presetCount} preset(s)
            </span>
          )}
        </p>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
