"use client";

import Image from "next/image";
import { Pause, Play, Plus, Check, Heart } from "lucide-react";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { useSamplePeaks } from "@/hooks/useSamplePeaks";
import { useSampleMeta } from "@/hooks/useSampleMeta";
import { Waveform } from "./Waveform";
import { StarRating } from "./StarRating";
import { cn, formatDuration, formatKey, parseTagsJson } from "@/lib/utils";
import { useState } from "react";

export function NowPlayingBar() {
  const { currentSample, isPlaying, progress, toggle, seek } = useAudioPlayer();

  if (!currentSample) return null;

  const { peaks } = useSamplePeaks(currentSample.id, currentSample.waveformPeaks);
  const { rating, favorite, updateMeta } = useSampleMeta(
    currentSample.id,
    currentSample.meta,
  );
  const [copied, setCopied] = useState(false);

  const coverUrl = currentSample.pack.coverPath
    ? `/api/covers/${currentSample.pack.id}`
    : null;
  const tags = [
    ...parseTagsJson(currentSample.tags),
    currentSample.type,
    currentSample.instrument,
  ].filter(Boolean);

  async function handleCopyToDaw() {
    try {
      const res = await fetch(`/api/samples/${currentSample!.id}/copy`, {
        method: "POST",
      });
      const data = (await res.json()) as { path?: string };
      if (data.path) await navigator.clipboard.writeText(data.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#12121a]/98 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-zinc-800">
          {coverUrl ? (
            <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => toggle(currentSample)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{currentSample.fileName}</p>
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 5).map((t) => (
              <span key={t} className="text-[10px] text-zinc-500">
                #{t}
              </span>
            ))}
          </div>
          <Waveform
            peaks={peaks}
            progress={progress}
            playing={isPlaying}
            interactive
            onSeek={seek}
            className="mt-1.5 max-w-xl"
            barClassName="bg-zinc-600"
            activeBarClassName="bg-sky-400"
          />
        </div>

        <div className="hidden shrink-0 text-xs text-zinc-400 md:block">
          {formatDuration(currentSample.durationMs)}
        </div>
        <div className="hidden shrink-0 text-xs text-zinc-400 md:block">
          {formatKey(currentSample.key)}
        </div>
        <div className="hidden shrink-0 text-xs tabular-nums text-zinc-400 md:block">
          {currentSample.bpm ?? "—"}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void handleCopyToDaw()}
            className={cn(
              "rounded p-2",
              copied ? "text-emerald-400" : "text-zinc-400 hover:text-white",
            )}
            title="Copiar para DAW"
          >
            {copied ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => updateMeta({ favorite: !favorite })}
            className={cn(
              "rounded p-2",
              favorite ? "text-rose-400" : "text-zinc-400 hover:text-rose-400",
            )}
          >
            <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
          </button>
          <StarRating value={rating} onChange={(r) => updateMeta({ rating: r })} />
        </div>
      </div>
    </div>
  );
}
