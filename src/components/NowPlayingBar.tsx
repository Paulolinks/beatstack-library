"use client";

import Image from "next/image";
import { Pause, Play, Download, Check, Heart, Loader2 } from "lucide-react";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { useSamplePeaks } from "@/hooks/useSamplePeaks";
import { useSampleMeta } from "@/hooks/useSampleMeta";
import { Waveform } from "./Waveform";
import { StarRating } from "./StarRating";
import { cn, formatDuration, formatKey, parseTagsJson } from "@/lib/utils";
import { downloadSampleFile, usesCopyFlow } from "@/lib/download-sample-client";
import { resolveSampleBpm, resolveSampleKey } from "@/lib/sample-metadata";
import { useMemo, useState } from "react";
import type { SampleListItem } from "./SampleRow";

function NowPlayingBarInner({ sample }: { sample: SampleListItem }) {
  const { isPlaying, progress, toggle, seek } = useAudioPlayer();
  const { peaks } = useSamplePeaks(sample.id, sample.waveformPeaks, true);
  const { rating, favorite, updateMeta } = useSampleMeta(sample.id, sample.meta);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const bpm = useMemo(
    () => resolveSampleBpm(sample.bpm, sample.fileName, sample.relativePath),
    [sample.bpm, sample.fileName, sample.relativePath],
  );
  const key = useMemo(
    () => resolveSampleKey(sample.key, sample.fileName, sample.relativePath),
    [sample.key, sample.fileName, sample.relativePath],
  );

  const coverUrl = sample.pack.coverPath ? `/api/covers/${sample.pack.id}` : null;
  const tags = [
    ...new Set(
      [...parseTagsJson(sample.tags), sample.type, sample.instrument]
        .filter(Boolean)
        .map((t) => String(t).toLowerCase()),
    ),
  ];

  async function handleDownloadSample() {
    setDownloading(true);
    try {
      const result = await downloadSampleFile(
        sample.id,
        sample.fileName,
        "downloads",
        sample.pack.slug,
      );
      if (!result.ok) {
        window.alert(result.error ?? "Não foi possível copiar o sample");
        return;
      }
      if (result.mode === "copy" && result.clipboardOk === false && result.path) {
        window.alert(`Sample salvo em:\n${result.path}\n\nCole no browser de arquivos do DAW.`);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#12121a]/98 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-4 px-4 py-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-zinc-800">
          {coverUrl ? (
            <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => toggle(sample)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" />
          )}
        </button>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{sample.fileName}</p>
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 5).map((t, i) => (
              <span key={`${sample.id}-tag-${i}`} className="text-[10px] text-zinc-500">
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
          />
        </div>

        <div className="shrink-0 text-xs tabular-nums text-zinc-400">
          {formatDuration(sample.durationMs)}
        </div>
        <div className="shrink-0 text-xs text-zinc-400">{formatKey(key)}</div>
        <div className="shrink-0 text-xs tabular-nums text-zinc-400">{bpm ?? "—"}</div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={downloading}
            onClick={() => void handleDownloadSample()}
            className={cn(
              "rounded-md p-2.5 transition",
              copied ? "text-emerald-400" : "text-zinc-400 hover:bg-white/5 hover:text-white",
              downloading && "opacity-60",
            )}
            title={
              usesCopyFlow()
                ? "Copia o sample — cole o caminho no browser de arquivos do DAW"
                : "Baixar sample"
            }
          >
            {downloading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : copied ? (
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4" />
                <span className="text-xs font-semibold">Copiado</span>
              </span>
            ) : (
              <Download className="h-5 w-5" />
            )}
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

export function NowPlayingBar() {
  const { currentSample } = useAudioPlayer();
  if (!currentSample) return null;
  return <NowPlayingBarInner key={currentSample.id} sample={currentSample} />;
}
