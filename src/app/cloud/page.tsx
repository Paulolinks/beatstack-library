"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Cloud, HardDrive, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import type { CloudRemotePack } from "@/components/cloud/CloudSampleRow";

type CloudPack = CloudRemotePack & { hasLocal: boolean };

async function fetchCloudPacks(): Promise<
  { packs: CloudPack[] } | { message: string; noConfig?: boolean }
> {
  try {
    const res = await fetch("/api/vps/packs");
    const json = (await res.json()) as { packs?: CloudPack[]; error?: string; code?: string };
    if (!res.ok) {
      return { message: json.error ?? `Erro ${res.status}`, noConfig: json.code === "NO_VPS_CONFIG" };
    }
    return { packs: json.packs ?? [] };
  } catch {
    return { message: "Erro de rede ao falar com o VPS" };
  }
}

export default function CloudPacksPage() {
  const [packs, setPacks] = useState<CloudPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; noConfig?: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const applyResult = useCallback((result: Awaited<ReturnType<typeof fetchCloudPacks>>) => {
    if ("packs" in result) {
      setPacks(result.packs);
      setError(null);
    } else {
      setError(result);
    }
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    applyResult(await fetchCloudPacks());
  }, [applyResult]);

  useEffect(() => {
    let cancelled = false;
    void fetchCloudPacks().then((result) => {
      if (!cancelled) applyResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [applyResult]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return packs;
    return packs.filter((p) =>
      [p.name, p.producer, p.genre].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [packs, query]);

  async function deletePack(pack: CloudPack) {
    if (
      !window.confirm(
        `Excluir "${pack.name}" do VPS?\n\nApaga do servidor para sempre. O que você salvou com o coração (pastas de favoritos no PC) continua.`,
      )
    ) {
      return;
    }
    setDeletingId(pack.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/vps/packs/${encodeURIComponent(pack.id)}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(`Erro ao excluir: ${json.error ?? res.status}`);
        return;
      }
      setPacks((prev) => prev.filter((p) => p.id !== pack.id));
      setMessage(`"${pack.name}" excluído do VPS.`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Cloud className="h-7 w-7 text-violet-400" />
            Packs no VPS
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Ouça os packs que estão online. O coração baixa o sample para o seu PC e guarda na pasta
            favorita ativa — se você apagar o pack do VPS depois, o sample salvo continua.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {error.message}
            {error.noConfig && (
              <>
                {" "}
                <Link href="/admin/sync-vps" className="underline">
                  Configurar conexão
                </Link>
              </>
            )}
          </span>
        </div>
      )}

      <div className="relative mb-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar pack no VPS..."
          className="w-full rounded-lg border border-white/10 bg-[#141418] py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando packs do VPS…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((pack) => (
            <div
              key={pack.id}
              className="group overflow-hidden rounded-xl border border-white/10 bg-[#141418] transition hover:border-white/20"
            >
              <Link href={`/cloud/${pack.id}`} className="block">
                <div className="relative aspect-square bg-zinc-900">
                  {pack.coverPath ? (
                    <Image
                      src={`/api/vps/covers/${pack.id}`}
                      alt={pack.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                      PACK
                    </div>
                  )}
                  {pack.hasLocal && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-emerald-300">
                      <HardDrive className="h-3 w-3" />
                      Também no PC
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-zinc-100">{pack.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {[pack.producer, `${pack.sampleCount} samples`].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </Link>
              <div className="border-t border-white/5 px-3 py-2">
                <button
                  type="button"
                  disabled={deletingId === pack.id}
                  onClick={() => void deletePack(pack)}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-400 disabled:opacity-50"
                >
                  {deletingId === pack.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Excluir do VPS
                </button>
              </div>
            </div>
          ))}
          {!error && filtered.length === 0 && (
            <p className="col-span-full text-sm text-zinc-500">Nenhum pack no VPS.</p>
          )}
        </div>
      )}
    </div>
  );
}
