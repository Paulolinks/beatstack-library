"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Pause, Play } from "lucide-react";
import { Waveform } from "./Waveform";
import { StarRating } from "./StarRating";
import { cn, formatDuration, parseWaveformPeaks } from "@/lib/utils";

export interface SampleListItem {
  id: string;
  displayName: string;
  fileName: string;
  durationMs: number | null;
  type: string | null;
  instrument: string | null;
  category: string | null;
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
  showPack = false,
}: {
  sample: SampleListItem;
  onMetaChange?: () => void;
  showPack?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const numericPeaks = parseWaveformPeaks(sample.waveformPeaks);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(`/api/audio/${sample.id}`);
      audioRef.current.addEventListener("timeupdate", () => {
        if (audioRef.current?.duration) {
          setProgress(audioRef.current.currentTime / audioRef.current.duration);
        }
      });
      audioRef.current.addEventListener("ended", () => {
        setPlaying(false);
        setProgress(0);
      });
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current.play();
      setPlaying(true);
    }
  }, [playing, sample.id]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  async function updateMeta(data: { rating?: number; favorite?: boolean }) {
    await fetch(`/api/samples/${sample.id}/meta`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    onMetaChange?.();
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 transition hover:border-white/10 hover:bg-white/[0.03]">
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition hover:bg-violet-500"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-200">{sample.displayName}</p>
          {showPack && (
            <span className="shrink-0 text-xs text-zinc-500">{sample.pack.name}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {sample.type && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">
              {sample.type}
            </span>
          )}
          {sample.instrument && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">
              {sample.instrument}
            </span>
          )}
          {sample.bpm && (
            <span className="text-[10px] text-zinc-500">{sample.bpm} BPM</span>
          )}
          {sample.key && (
            <span className="text-[10px] text-zinc-500">{sample.key}</span>
          )}
          <span className="text-[10px] text-zinc-600">{formatDuration(sample.durationMs)}</span>
        </div>
        <Waveform
          peaks={numericPeaks.length ? numericPeaks : []}
          progress={progress}
          playing={playing}
          className="mt-2 max-w-md opacity-70 group-hover:opacity-100"
        />
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => updateMeta({ favorite: !sample.meta?.favorite })}
          className={cn(
            "rounded p-1 transition",
            sample.meta?.favorite
              ? "text-rose-400"
              : "text-zinc-600 hover:text-rose-400",
          )}
        >
          <Heart
            className={cn("h-4 w-4", sample.meta?.favorite && "fill-current")}
          />
        </button>
        <StarRating
          value={sample.meta?.rating}
          onChange={(rating) => updateMeta({ rating })}
        />
      </div>
    </div>
  );
}
