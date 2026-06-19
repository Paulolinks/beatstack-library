"use client";

import Link from "next/link";
import Image from "next/image";
import { Music2 } from "lucide-react";

export interface PackCardData {
  id: string;
  name: string;
  slug: string;
  producer: string | null;
  coverPath: string | null;
  sampleCount: number;
  genre: string | null;
}

export function PackCard({ pack }: { pack: PackCardData }) {
  const coverUrl = pack.coverPath ? `/api/covers/${pack.id}` : null;

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
      </div>
      <div className="p-3">
        <h3 className="truncate font-medium text-zinc-100">{pack.name}</h3>
        {pack.producer && (
          <p className="truncate text-sm text-zinc-500">{pack.producer}</p>
        )}
        <p className="mt-1 text-xs text-zinc-600">
          {pack.sampleCount} samples
          {pack.genre ? ` · ${pack.genre}` : ""}
        </p>
      </div>
    </Link>
  );
}
