"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Music2 } from "lucide-react";
import { PackAdminEditor } from "@/components/PackAdminEditor";
import { PackDeleteButton } from "@/components/PackDeleteButton";
import { useI18n } from "@/lib/i18n/context";

export function PackPageHeader({
  pack,
  types,
  isAdmin = false,
}: {
  pack: {
    id: string;
    name: string;
    slug: string;
    producer: string | null;
    coverPath: string | null;
    sampleCount: number;
    presetCount: number;
    genre: string | null;
  };
  types: string[];
  isAdmin?: boolean;
}) {
  const { t } = useI18n();
  const [editOpen, setEditOpen] = useState(false);
  const [coverVersion, setCoverVersion] = useState(pack.coverPath ?? "");
  const coverUrl = coverVersion ? `/api/covers/${pack.id}?v=${encodeURIComponent(coverVersion)}` : null;

  function handleEditorClose(updatedCoverPath?: string) {
    setEditOpen(false);
    if (updatedCoverPath !== undefined) {
      setCoverVersion(updatedCoverPath || `${Date.now()}`);
    }
  }

  return (
    <>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToPacks")}
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
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{pack.name}</h1>
              {pack.producer && <p className="mt-1 text-zinc-400">{pack.producer}</p>}
              <p className="mt-2 text-sm text-zinc-500">
                {pack.sampleCount} samples
                {pack.presetCount > 0 ? ` · ${pack.presetCount} pasta(s) de presets` : ""}
                {pack.genre ? ` · ${pack.genre}` : ""}
              </p>
            </div>
            {isAdmin && !editOpen && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <PackAdminEditor
                  packId={pack.id}
                  initialName={pack.name}
                  initialProducer={pack.producer}
                  initialGenre={pack.genre}
                  hasCover={Boolean(coverVersion)}
                  mode="button"
                  onOpen={() => setEditOpen(true)}
                />
                <PackDeleteButton
                  packId={pack.id}
                  packName={pack.name}
                  redirectTo="/"
                  size="md"
                />
              </div>
            )}
          </div>
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

      {isAdmin && editOpen && (
        <div className="mb-8">
          <PackAdminEditor
            packId={pack.id}
            initialName={pack.name}
            initialProducer={pack.producer}
            initialGenre={pack.genre}
            hasCover={Boolean(coverVersion)}
            mode="panel"
            onClose={handleEditorClose}
          />
        </div>
      )}
    </>
  );
}
