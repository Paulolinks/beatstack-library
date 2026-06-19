"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FolderOpen,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { cn, parseTagsJson } from "@/lib/utils";
import { copyFileToClipboard } from "@/lib/clipboard-client";
import { presetKindLabel } from "@/lib/preset-kinds";
import { PresetKindBadges } from "@/components/PresetKindBadges";
import { isLocalApp } from "@/lib/download-sample-client";

export interface PackAssetItem {
  id: string;
  name: string;
  relativePath: string;
  presetKind: string | null;
  fileCount: number;
  tags: string;
  pack: {
    id: string;
    name: string;
    slug: string;
    coverPath: string | null;
    producer: string | null;
  };
  meta: { downloadedAt?: string | Date | null } | null;
}

export function PresetFolderList({
  assets,
  showPack = false,
  onCopied,
}: {
  assets: PackAssetItem[];
  showPack?: boolean;
  onCopied?: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (assets.length === 0) return null;

  const kinds = [...new Set(assets.map((a) => a.presetKind).filter(Boolean))] as string[];

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-left transition hover:bg-amber-500/15"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-amber-200">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="font-medium">Presets disponível</span>
          {kinds.length > 0 && <PresetKindBadges kinds={kinds} size="sm" />}
          <span className="text-xs text-amber-200/60">
            {assets.length} pasta{assets.length !== 1 ? "s" : ""}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-amber-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="mt-2 overflow-hidden rounded-lg border border-white/10 bg-[#101014]">
          <p className="border-b border-white/10 px-3 py-2 text-xs text-zinc-500">
            Baixe o ZIP e extraia na pasta do plugin no seu PC
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-[#0d0d12] text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                {showPack && <th className="px-3 py-2 text-left">Pack</th>}
                <th className="px-3 py-2 text-left">Plugin</th>
                <th className="px-3 py-2 text-left">Pasta</th>
                <th className="px-3 py-2 text-right">Arquivos</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <PresetFolderRow
                  key={asset.id}
                  asset={asset}
                  showPack={showPack}
                  onCopied={onCopied}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PresetFolderRow({
  asset,
  showPack,
  onCopied,
}: {
  asset: PackAssetItem;
  showPack: boolean;
  onCopied?: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const isDownloaded = Boolean(asset.meta?.downloadedAt);
  const tags = parseTagsJson(asset.tags);
  const coverUrl = asset.pack.coverPath ? `/api/covers/${asset.pack.id}` : null;
  const pluginLabel = presetKindLabel(asset.presetKind);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}/download`);
      if (!res.ok) throw new Error("Falha no download");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${asset.name.replace(/[<>:"/\\|?*]/g, "_")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      onCopied?.();
    } catch {
      /* ignore */
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyPath() {
    try {
      const res = await fetch(`/api/assets/${asset.id}/copy`, { method: "POST" });
      const data = (await res.json()) as { path?: string; error?: string };
      if (!res.ok) throw new Error(data.error);
      if (data.path) {
        const ok = await copyFileToClipboard(data.path);
        if (!ok) window.prompt("Cole este caminho na pasta de presets do plugin:", data.path);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopied?.();
    } catch {
      /* ignore */
    }
  }

  async function handleLocalOrDownload() {
    if (isLocalApp()) {
      await handleCopyPath();
      return;
    }
    await handleDownload();
  }

  return (
    <tr className="border-b border-white/[0.06] hover:bg-white/[0.02]">
      {showPack && (
        <td className="px-3 py-3 align-middle">
          <Link href={`/packs/${asset.pack.slug}`} className="flex items-center gap-2">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-zinc-800">
              {coverUrl ? (
                <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
              ) : (
                <FolderOpen className="m-auto h-4 w-4 text-zinc-600" />
              )}
            </div>
            <span className="truncate text-xs text-zinc-400">{asset.pack.name}</span>
          </Link>
        </td>
      )}
      <td className="px-3 py-3 align-middle">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-200">
          {pluginLabel}
        </span>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 shrink-0 text-amber-500/80" />
          <div>
            <p className="font-medium text-zinc-100">{asset.name}</p>
            {tags.length > 0 && (
              <p className="text-[11px] text-zinc-600">
                {tags.filter((t) => t !== "presets").map((t) => `#${t}`).join(" ")}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-right align-middle tabular-nums text-zinc-400">
        {asset.fileCount}
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            title={
              isLocalApp()
                ? "Copiar presets para Documents/BeatStack Library/Presets"
                : "Baixar pasta de presets (ZIP)"
            }
            disabled={downloading}
            onClick={() => void handleLocalOrDownload()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              isDownloaded
                ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                : "bg-violet-600 text-white hover:bg-violet-500",
              downloading && "opacity-70",
            )}
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : copied || isDownloaded ? (
              <Check className="h-3.5 w-3.5" />
            ) : isLocalApp() ? (
              <Copy className="h-3.5 w-3.5" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {isLocalApp() ? "Copiar presets" : "Baixar presets"}
          </button>
          {isLocalApp() ? null : (
          <button
            type="button"
            title="Copiar para staging local (mesmo PC)"
            onClick={() => void handleCopyPath()}
            className={cn(
              "rounded-lg border border-white/10 p-2 transition hover:bg-white/5",
              copied ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          )}
        </div>
      </td>
    </tr>
  );
}
