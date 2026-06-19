"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { SampleTable } from "@/components/SampleTable";
import type { SampleListItem } from "@/components/SampleRow";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [typeFilter, setTypeFilter] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [minRating, setMinRating] = useState("");
  const [samples, setSamples] = useState<SampleListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (typeFilter) params.set("type", typeFilter);
    if (favoritesOnly) params.set("favorite", "true");
    if (minRating) params.set("minRating", minRating);

    const res = await fetch(`/api/samples?${params.toString()}`);
    const data = (await res.json()) as { samples: SampleListItem[] };
    setSamples(data.samples);
    setLoading(false);
  }, [query, typeFilter, favoritesOnly, minRating]);

  useEffect(() => {
    void search();
  }, [search]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="kick dubstep, Sullivan King, guitar loop 140..."
            className="w-full rounded-lg border border-white/10 bg-[#141418] py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => search()}
          className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
        >
          Buscar
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {["kick", "snare", "clap", "hat", "bass", "guitar", "vocal", "fx", "loop"].map(
          (t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(typeFilter === t ? "" : t)}
              className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide transition ${
                typeFilter === t
                  ? "bg-sky-600 text-white"
                  : "bg-white/10 text-zinc-400 hover:bg-white/15"
              }`}
            >
              {t}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={`rounded-full px-3 py-1 text-xs transition ${
            favoritesOnly
              ? "bg-rose-600/80 text-white"
              : "bg-white/10 text-zinc-400 hover:bg-white/15"
          }`}
        >
          Favoritos
        </button>
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#141418] px-3 py-1 text-xs text-zinc-300"
        >
          <option value="">Qualquer nota</option>
          <option value="5">5 estrelas</option>
          <option value="4">4+ estrelas</option>
          <option value="3">3+ estrelas</option>
        </select>
      </div>

      <p className="mb-4 text-sm text-zinc-500">
        {loading ? "Buscando..." : `${samples.length} resultado(s)`}
      </p>

      {!loading && samples.length === 0 ? (
        <p className="rounded-lg border border-white/10 p-8 text-center text-sm text-zinc-500">
          Nenhum sample encontrado.
        </p>
      ) : (
        <SampleTable samples={samples} onMetaChange={search} />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Buscar samples</h1>
      <Suspense fallback={<p className="text-zinc-500">Carregando...</p>}>
        <SearchContent />
      </Suspense>
    </div>
  );
}
