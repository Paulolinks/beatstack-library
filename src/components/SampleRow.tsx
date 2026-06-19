"use client";

import Image from "next/image";
import { Heart, Pause, Play, Plus, Check } from "lucide-react";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { useSamplePeaks } from "@/hooks/useSamplePeaks";
import { useSampleMeta } from "@/hooks/useSampleMeta";
import { Waveform } from "./Waveform";
import { StarRating } from "./StarRating";
import {
  cn,
  formatDuration,
  formatKey,
  parseTagsJson,
} from "@/lib/utils";
import { useState } from "react";

export interface SampleListItem {
  id: string;
  displayName: string;
  fileName: string;
  durationMs: number | null;
  type: string | null;
  instrument: string | null;
  category: string | null;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  tags: string;
  waveformPeaks: string | null;
  pack: {
    id: string;
    name: string;
    slug: string;
    producer: string | null;
    coverPath: string | null;
  };
  meta: {
    rating: number | null;
    favorite: boolean;
  } | null;
}

export function SampleRow({
  sample,
  onMetaChange,
  showPackCover = true,
}: {
  sample: SampleListItem;
  onMetaChange?: () => void;
  showPackCover?: boolean;
}) {
  const { currentSample, isPlaying, progress, toggle, seek } = useAudioPlayer();
  const { peaks } = useSamplePeaks(sample.id, sample.waveformPeaks);
  const { rating, favorite, updateMeta } = useSampleMeta(
    sample.id,
    sample.meta,
    onMetaChange,
  );
  const [copied, setCopied] = useState(false);

  const isCurrent = currentSample?.id === sample.id;
  const playing = isCurrent && isPlaying;
  const tags = buildTags(sample);
  const coverUrl = sample.pack.coverPath ? `/api/covers/${sample.pack.id}` : null;

  async function handleCopyToDaw() {
    try {
      const res = await fetch(`/api/samples/${sample.id}/copy`, { method: "POST" });
      const data = (await res.json()) as { path?: string; error?: string };
      if (!res.ok) throw new Error(data.error);

      if (data.path) {
        await navigator.clipboard.writeText(data.path);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(`/api/audio/${sample.id}`, "_blank");
    }
  }

  return (
    <div
      className={cn(
        "group grid grid-cols-[auto_auto_minmax(0,1fr)_minmax(120px,180px)_48px_56px_48px_auto] items-center gap-3 border-b border-white/[0.06] px-3 py-2 transition",
        isCurrent ? "bg-sky-950/30" : "hover:bg-white/[0.03]",
      )}
    >
      {showPackCover && (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-zinc-800">
          {coverUrl ? (
            <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
              PACK
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => toggle(sample)}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
          playing
            ? "bg-sky-500 text-white"
            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
        )}
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="ml-0.5 h-3.5 w-3.5" />
        )}
      </button>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-100">{sample.fileName}</p>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span key={tag} className="text-[11px] text-zinc-500">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <Waveform
        peaks={peaks}
        progress={isCurrent ? progress : 0}
        playing={playing}
        interactive={isCurrent}
        onSeek={isCurrent ? seek : undefined}
        className="hidden sm:flex"
        barClassName="bg-zinc-600 group-hover:bg-zinc-500"
        activeBarClassName="bg-sky-400"
      />

      <span className="text-right text-xs tabular-nums text-zinc-400">
        {formatDuration(sample.durationMs)}
      </span>

      <span className="text-right text-xs text-zinc-400">{formatKey(sample.key)}</span>

      <span className="text-right text-xs tabular-nums text-zinc-400">
        {sample.bpm ?? "—"}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Copiar para pasta DAW"
          onClick={() => void handleCopyToDaw()}
          className={cn(
            "rounded p-1.5 transition",
            copied ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-200",
          )}
        >
          {copied ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
        <button
          type="button"
          title="Favorito"
          onClick={() => updateMeta({ favorite: !favorite })}
          className={cn(
            "rounded p-1.5 transition",
            favorite ? "text-rose-400" : "text-zinc-500 hover:text-rose-400",
          )}
        >
          <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
        </button>
        <StarRating
          value={rating}
          onChange={(r) => updateMeta({ rating: r })}
        />
      </div>
    </div>
  );
}

function buildTags(sample: SampleListItem): string[] {
  const fromJson = parseTagsJson(sample.tags);
  const extra = [sample.type, sample.instrument, sample.category, sample.genre].filter(
    Boolean,
  ) as string[];
  return [...new Set([...fromJson, ...extra])].slice(0, 8);
}
