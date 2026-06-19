"use client";

import Image from "next/image";
import { Heart, Pause, Play, Plus, Check } from "lucide-react";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { useSamplePeaks } from "@/hooks/useSamplePeaks";
import { useSampleMeta } from "@/hooks/useSampleMeta";
import { Waveform } from "./Waveform";
import { StarRating } from "./StarRating";
import { cn, formatDuration, formatKey, parseTagsJson } from "@/lib/utils";
import { resolveSampleBpm, resolveSampleKey } from "@/lib/sample-metadata";
import { useMemo, useState } from "react";

export interface SampleListItem {
  id: string;
  displayName: string;
  fileName: string;
  relativePath?: string;
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
}: {
  sample: SampleListItem;
  onMetaChange?: () => void;
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

  const bpm = useMemo(
    () => resolveSampleBpm(sample.bpm, sample.fileName, sample.relativePath),
    [sample.bpm, sample.fileName, sample.relativePath],
  );
  const key = useMemo(
    () => resolveSampleKey(sample.key, sample.fileName, sample.relativePath),
    [sample.key, sample.fileName, sample.relativePath],
  );

  async function handleCopyToDaw() {
    try {
      const res = await fetch(`/api/samples/${sample.id}/copy`, { method: "POST" });
      const data = (await res.json()) as { path?: string; error?: string };
      if (!res.ok) throw new Error(data.error);
      if (data.path) await navigator.clipboard.writeText(data.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(`/api/audio/${sample.id}`, "_blank");
    }
  }

  return (
    <tr
      className={cn(
        "group border-b border-white/[0.06] transition",
        isCurrent ? "bg-sky-950/30" : "hover:bg-white/[0.03]",
      )}
    >
      <td className="px-2 py-2 align-middle">
        <div className="relative mx-auto h-10 w-10 overflow-hidden rounded bg-zinc-800">
          {coverUrl ? (
            <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[9px] text-zinc-600">
              PACK
            </div>
          )}
        </div>
      </td>

      <td className="px-1 py-2 align-middle">
        <button
          type="button"
          onClick={() => toggle(sample)}
          className={cn(
            "mx-auto flex h-8 w-8 items-center justify-center rounded-full transition",
            playing ? "bg-sky-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
          )}
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5" />
          )}
        </button>
      </td>

      <td className="px-2 py-2 align-middle">
        <p className="truncate text-sm font-medium text-zinc-100">{sample.fileName}</p>
        <div className="mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0">
          {tags.map((tag) => (
            <span key={tag} className="text-[11px] text-zinc-500">
              #{tag}
            </span>
          ))}
        </div>
      </td>

      <td className="px-2 py-2 align-middle">
        <Waveform
          peaks={peaks}
          progress={isCurrent ? progress : 0}
          playing={playing}
          interactive={isCurrent}
          onSeek={isCurrent ? seek : undefined}
        />
      </td>

      <td className="px-2 py-2 text-right align-middle text-xs tabular-nums text-zinc-400">
        {formatDuration(sample.durationMs)}
      </td>

      <td className="px-2 py-2 text-right align-middle text-xs text-zinc-400">
        {formatKey(key)}
      </td>

      <td className="px-2 py-2 text-right align-middle text-xs tabular-nums text-zinc-400">
        {bpm ?? "—"}
      </td>

      <td className="px-2 py-2 align-middle">
        <div className="flex items-center justify-end gap-0.5">
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
          <StarRating value={rating} onChange={(r) => updateMeta({ rating: r })} />
        </div>
      </td>
    </tr>
  );
}

function buildTags(sample: SampleListItem): string[] {
  const fromJson = parseTagsJson(sample.tags);
  const extra = [sample.type, sample.instrument, sample.category, sample.genre].filter(
    Boolean,
  ) as string[];
  return [...new Set([...fromJson, ...extra])].slice(0, 8);
}
