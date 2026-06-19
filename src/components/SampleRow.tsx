"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Heart, Pause, Play, Download, Check, Loader2 } from "lucide-react";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { useSamplePeaks, useRowVisible } from "@/hooks/useSamplePeaks";
import { useSampleMeta } from "@/hooks/useSampleMeta";
import { Waveform } from "./Waveform";
import { StarRating } from "./StarRating";
import { cn, formatDuration, formatKey, parseTagsJson, parseWaveformPeaks } from "@/lib/utils";
import { resolveSampleBpm, resolveSampleKey } from "@/lib/sample-metadata";
import { isLikelyFakePeaks } from "@/lib/audio/waveform-client";
import { downloadSampleFile, usesCopyFlow, type CopyFolder } from "@/lib/download-sample-client";
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
    downloadedAt?: string | Date | null;
  } | null;
}

export function SampleRow({
  sample,
  onMetaChange,
  onTagClick,
  copyFolder = "downloads",
}: {
  sample: SampleListItem;
  onMetaChange?: () => void;
  onTagClick?: (tag: string) => void;
  copyFolder?: CopyFolder;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const { currentSample, isPlaying, progress, toggle, seek } = useAudioPlayer();
  const isCurrent = currentSample?.id === sample.id;
  const playing = isCurrent && isPlaying;
  const rowVisible = useRowVisible(rowRef);

  const storedPeaks = parseWaveformPeaks(sample.waveformPeaks);
  const needsDecode =
    storedPeaks.length < 64 || isLikelyFakePeaks(storedPeaks);

  const { peaks } = useSamplePeaks(
    sample.id,
    sample.waveformPeaks,
    isCurrent || (rowVisible && needsDecode),
  );

  const { rating, favorite, updateMeta } = useSampleMeta(
    sample.id,
    sample.meta,
    onMetaChange,
  );
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const isDownloaded = Boolean(sample.meta?.downloadedAt);

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

  async function handleDownloadSample() {
    setDownloading(true);
    try {
      const result = await downloadSampleFile(
        sample.id,
        sample.fileName,
        copyFolder,
        sample.pack.slug,
      );
      if (!result.ok) {
        window.alert(result.error ?? "Não foi possível copiar o sample");
        return;
      }
      if (result.mode === "copy" && result.clipboardOk === false && result.path) {
        window.alert(
          `Sample salvo em:\n${result.path}\n\nCole no browser de arquivos do DAW ou use Ctrl+V na timeline.`,
        );
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      onMetaChange?.();
    } finally {
      setDownloading(false);
    }
  }

  const actionTitle = usesCopyFlow()
    ? "Copia o sample — Ctrl+V na timeline ou browser de arquivos do DAW"
    : "Baixar sample";

  return (
    <tr
      ref={rowRef}
      className={cn(
        "group border-b border-white/[0.06] transition",
        isCurrent ? "bg-sky-950/30" : "hover:bg-white/[0.03]",
      )}
    >
      <td className="px-2 py-2 align-middle">
        <Link
          href={`/packs/${sample.pack.slug}`}
          title={`Ver pack: ${sample.pack.name}`}
          className="relative mx-auto block h-10 w-10 overflow-hidden rounded bg-zinc-800 ring-0 transition hover:ring-2 hover:ring-sky-500/50"
        >
          {coverUrl ? (
            <Image src={coverUrl} alt={sample.pack.name} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[9px] text-zinc-600 transition group-hover:text-zinc-400">
              PACK
            </div>
          )}
        </Link>
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
          {tags.map((tag, i) =>
            onTagClick ? (
              <button
                key={`${sample.id}-${tag}-${i}`}
                type="button"
                onClick={() => onTagClick(tag)}
                className="text-[11px] text-zinc-500 transition hover:text-sky-400"
              >
                #{tag}
              </button>
            ) : (
              <span key={`${sample.id}-${tag}-${i}`} className="text-[11px] text-zinc-500">
                #{tag}
              </span>
            ),
          )}
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

      <td className="px-1 py-2 align-middle">
        <div className="flex items-center justify-end gap-1 pr-1">
          <button
            type="button"
            title={actionTitle}
            disabled={downloading}
            onClick={() => void handleDownloadSample()}
            className={cn(
              "inline-flex min-w-[72px] items-center justify-center gap-1 rounded-md px-1.5 py-2 transition",
              copied || isDownloaded
                ? "text-emerald-400"
                : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200",
              downloading && "opacity-60",
            )}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : copied ? (
              <>
                <Check className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-semibold leading-none">Copiado</span>
              </>
            ) : isDownloaded ? (
              <Check className="h-5 w-5" />
            ) : (
              <Download className="h-5 w-5" />
            )}
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
  return [...new Set([...fromJson, ...extra].map((t) => t.toLowerCase()))].slice(0, 8);
}
