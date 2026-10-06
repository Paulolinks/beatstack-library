"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Cloud, Loader2, Search } from "lucide-react";
import {
  CloudSampleRow,
  type CloudRemotePack,
  type CloudRemoteSample,
} from "@/components/cloud/CloudSampleRow";

export default function CloudPackPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [pack, setPack] = useState<CloudRemotePack | null>(null);
  const [samples, setSamples] = useState<CloudRemoteSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/vps/packs/${encodeURIComponent(id)}`)
      .then(async (res) => {
        const json = (await res.json()) as {
          pack?: CloudRemotePack;
          samples?: CloudRemoteSample[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !json.pack) {
          setError(json.error ?? `Erro ${res.status}`);
          return;
        }
        setPack(json.pack);
        setSamples(json.samples ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Erro de rede ao falar com o VPS");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return samples;
    return samples.filter((s) =>
      [s.fileName, s.relativePath, s.type, s.instrument, s.category, s.tags].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [samples, query]);

  return (
    <div>
      <Link
        href="/cloud"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Packs no VPS
      </Link>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando samples do VPS…
        </div>
      )}

      {error && (
        <div className="flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {pack && !loading && (
        <>
          <div className="mb-6 flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
              {pack.coverPath ? (
                <Image
                  src={`/api/vps/covers/${pack.id}`}
                  alt={pack.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-violet-400">
                <Cloud className="h-3.5 w-3.5" />
                VPS
              </p>
              <h1 className="truncate text-2xl font-semibold tracking-tight">{pack.name}</h1>
              <p className="text-sm text-zinc-500">
                {[pack.producer, pack.genre, `${samples.length} samples`].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <div className="relative mb-4 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar neste pack..."
              className="w-full rounded-lg border border-white/10 bg-[#141418] py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#101014]">
            <table className="w-full min-w-[800px] table-fixed border-collapse">
              <colgroup>
                <col className="w-10" />
                <col className="w-[32%]" />
                <col className="w-[28%]" />
                <col className="w-14" />
                <col className="w-[72px]" />
                <col className="w-12" />
                <col className="w-14" />
              </colgroup>
              <thead>
                <tr className="border-b border-white/10 bg-[#0d0d12] text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  <th className="px-1 py-2" />
                  <th className="px-2 py-2 text-left font-medium">Filename</th>
                  <th className="px-2 py-2 text-center font-medium">Waveform</th>
                  <th className="px-2 py-2 text-right font-medium">Time</th>
                  <th className="px-2 py-2 text-right font-medium">Key</th>
                  <th className="px-2 py-2 text-right font-medium">BPM</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-zinc-500">
                      Nenhum sample
                    </td>
                  </tr>
                ) : (
                  filtered.map((sample) => (
                    <CloudSampleRow key={sample.id} sample={sample} pack={pack} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
