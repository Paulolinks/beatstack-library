"use client";

import { useCallback, useEffect, useState } from "react";
import { HardDrive, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Usage = {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  packsBytes: number;
  packCount: number;
  computedAt: string;
};

function formatGb(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 100) return `${gb.toFixed(0)} GB`;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
}

async function fetchUsage(endpoint: string, refresh: boolean) {
  try {
    const res = await fetch(refresh ? `${endpoint}?refresh=1` : endpoint);
    const json = (await res.json()) as Usage & { error?: string };
    if (!res.ok || typeof json.totalBytes !== "number") {
      return { error: json.error ?? `Erro ${res.status}` };
    }
    return { usage: json };
  } catch {
    return { error: "Erro de rede" };
  }
}

/** Barra de espaço em disco — no Library (VPS) mostra o disco do servidor. */
export function StorageUsageCard({
  endpoint,
  title,
  className,
}: {
  endpoint: string;
  title: string;
  className?: string;
}) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchUsage>>) => {
    if (result.usage) {
      setUsage(result.usage);
      setError(null);
    } else {
      setError(result.error ?? "Erro");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchUsage(endpoint, false).then((r) => {
      if (!cancelled) apply(r);
    });
    return () => {
      cancelled = true;
    };
  }, [endpoint, apply]);

  async function refresh() {
    setLoading(true);
    apply(await fetchUsage(endpoint, true));
  }

  const packsPct = usage ? (usage.packsBytes / usage.totalBytes) * 100 : 0;
  const otherPct = usage ? Math.max(0, ((usage.usedBytes - usage.packsBytes) / usage.totalBytes) * 100) : 0;
  const freePct = usage ? (usage.freeBytes / usage.totalBytes) * 100 : 100;
  const level = !usage
    ? "ok"
    : usage.freeBytes < 8 * 1024 ** 3 || freePct < 8
      ? "critical"
      : usage.freeBytes < 20 * 1024 ** 3 || freePct < 20
        ? "warn"
        : "ok";

  return (
    <div className={cn("rounded-xl border border-white/10 bg-[#141418] p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <HardDrive className="h-4 w-4 text-sky-400" />
          {title}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          title="Recalcular"
          className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>

      {error && !usage && <p className="text-xs text-rose-300">{error}</p>}
      {!usage && !error && <p className="text-xs text-zinc-500">Calculando espaço…</p>}

      {usage && (
        <>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-violet-500" style={{ width: `${packsPct}%` }} title="Packs" />
            <div className="h-full bg-zinc-500" style={{ width: `${otherPct}%` }} title="Outros arquivos do servidor" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
            <span
              className={cn(
                "font-medium",
                level === "critical" ? "text-rose-400" : level === "warn" ? "text-amber-400" : "text-emerald-400",
              )}
            >
              {formatGb(usage.freeBytes)} livres de {formatGb(usage.totalBytes)}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
              Packs: {formatGb(usage.packsBytes)} ({usage.packCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-zinc-500" />
              Outros do servidor: {formatGb(Math.max(0, usage.usedBytes - usage.packsBytes))}
            </span>
          </div>
          {level !== "ok" && (
            <p className={cn("mt-2 text-xs", level === "critical" ? "text-rose-300" : "text-amber-300")}>
              {level === "critical"
                ? "Espaço quase acabando — exclua packs antes de enviar novos."
                : "Espaço ficando curto — considere excluir packs que não usa mais."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
