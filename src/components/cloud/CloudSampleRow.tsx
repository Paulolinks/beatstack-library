"use client";

import { useMemo, useRef, useState } from "react";
import { Heart, Loader2, Pause, Play } from "lucide-react";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { useRowVisible, useSamplePeaks } from "@/hooks/useSamplePeaks";
import { Waveform } from "@/components/Waveform";
import type { SampleListItem } from "@/components/SampleRow";
import { cn, formatDuration, formatKey, parseTagsJson, parseWaveformPeaks } from "@/lib/utils";
import { resolveSampleBpm, resolveSampleKey } from "@/lib/sample-metadata";
import { isLikelyFakePeaks } from "@/lib/audio/waveform-client";
import { dispatchFoldersChanged } from "@/lib/manager/favorite-folder-events";

export type CloudRemoteSample = {
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
  searchText?: string | null;
  meta?: { rating: number | null; favorite: boolean } | null;
};

export type CloudRemotePack = {
  id: string;
  slug: string;
  name: string;
  producer: string | null;
  genre: string | null;
  coverPath: string | null;
  sampleCount: number;
  importedAt: string | null;
};

export function toCloudPlayerItem(sample: CloudRemoteSample, pack: CloudRemotePack): SampleListItem {
  return {
    ...sample,
    id: `vps:${sample.id}`,
    source: "cloud",
    audioUrl: `/api/vps/audio/${encodeURIComponent(sample.id)}`,
    coverUrl: pack.coverPath ? `/api/vps/covers/${encodeURIComponent(pack.id)}` : null,
    pack: {
      id: pack.id,
      name: pack.name,
      slug: pack.slug,
      producer: pack.producer,
      coverPath: null,
    },
    meta: { rating: null, favorite: sample.meta?.favorite ?? false },
  };
}

export function CloudSampleRow({
  sample,
  pack,
}: {
  sample: CloudRemoteSample;
  pack: CloudRemotePack;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const item = useMemo(() => toCloudPlayerItem(sample, pack), [sample, pack]);
  const { currentSample, isPlaying, progress, toggle, seek } = useAudioPlayer();
  const isCurrent = currentSample?.id === item.id;
  const playing = isCurrent && isPlaying;
  const rowVisible = useRowVisible(rowRef);

  const stored = parseWaveformPeaks(sample.waveformPeaks);
  const needsDecode = stored.length < 64 || isLikelyFakePeaks(stored);
  const { peaks } = useSamplePeaks(item.id, sample.waveformPeaks, isCurrent || (rowVisible && needsDecode), {
    audioUrl: item.audioUrl,
    persist: false,
  });

  const [favorite, setFavorite] = useState(sample.meta?.favorite ?? false);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const bpm = resolveSampleBpm(sample.bpm, sample.fileName, sample.relativePath);
  const key = resolveSampleKey(sample.key, sample.fileName, sample.relativePath);
  const tags = [
    ...new Set(
      [...parseTagsJson(sample.tags), sample.type, sample.instrument, sample.category]
        .filter(Boolean)
        .map((t) => String(t).toLowerCase()),
    ),
  ].slice(0, 6);

  async function handleFavorite() {
    const next = !favorite;
    setSaving(true);
    try {
      const res = await fetch("/api/vps/save-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: next, pack, sample }),
      });
      const json = (await res.json()) as { error?: string; favoriteFolderName?: string };
      if (!res.ok) {
        window.alert(json.error ?? "Não foi possível salvar no PC");
        return;
      }
      setFavorite(next);
      setSavedHint(next ? `Salvo no PC em "${json.favoriteFolderName ?? "Favoritos"}"` : null);
      dispatchFoldersChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr
      ref={rowRef}
      className={cn(
        "group border-b border-white/[0.06] transition",
        isCurrent ? "bg-sky-950/30" : "hover:bg-white/[0.03]",
      )}
    >
      <td className="px-1 py-2 align-middle">
        <button
          type="button"
          onClick={() => toggle(item)}
          className={cn(
            "mx-auto flex h-8 w-8 items-center justify-center rounded-full transition",
            playing ? "bg-sky-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
          )}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
        </button>
      </td>
      <td className="px-2 py-2 align-middle">
        <p className="truncate text-sm font-medium text-zinc-100">{sample.fileName}</p>
        <div className="mt-0.5 flex flex-wrap gap-x-1.5">
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
      <td className="px-2 py-2 text-right align-middle text-xs text-zinc-400">{formatKey(key)}</td>
      <td className="px-2 py-2 text-right align-middle text-xs tabular-nums text-zinc-400">
        {bpm ?? "—"}
      </td>
      <td className="px-1 py-2 align-middle">
        <div className="flex items-center justify-end pr-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleFavorite()}
            title={
              savedHint ??
              (favorite
                ? "Tirar da pasta favorita ativa"
                : "Baixa para o PC e salva na pasta favorita ativa (fica mesmo se apagar o pack do VPS)")
            }
            className={cn(
              "rounded p-1.5 transition",
              favorite ? "text-rose-400" : "text-zinc-500 hover:text-rose-400",
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
