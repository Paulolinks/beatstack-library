"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { SampleTable } from "@/components/SampleTable";
import type { SampleListItem } from "@/components/SampleRow";

export type SampleBrowserPreset = {
  rated?: boolean;
  favorite?: boolean;
  downloaded?: boolean;
};

const TYPE_FILTERS = ["kick", "snare", "clap", "hat", "bass", "guitar", "vocal", "fx", "perc", "drums"];

function SampleBrowserInner({
  title,
  preset,
  showRatingFilter = true,
}: {
  title: string;
  preset?: SampleBrowserPreset;
  showRatingFilter?: boolean;
}) {
  const searchParams = useSearchParams();
  const presetRated = preset?.rated ?? false;
  const presetFavorite = preset?.favorite ?? false;
  const presetDownloaded = preset?.downloaded ?? false;

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const raw = searchParams.get("tags");
    return raw ? raw.split(",").filter(Boolean) : [];
  });
  const [tagInput, setTagInput] = useState("");
  const [minRating, setMinRating] = useState(searchParams.get("minRating") || "");
  const [samples, setSamples] = useState<SampleListItem[]>([]);
  const [popularTags, setPopularTags] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/tags")
      .then((r) => r.json())
      .then((d: { tags: { name: string; count: number }[] }) => setPopularTags(d.tags ?? []));
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (typeFilter) params.set("type", typeFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (selectedTags.length) params.set("tags", selectedTags.join(","));
    if (minRating && !presetRated) params.set("minRating", minRating);
    if (presetRated) params.set("rated", "true");
    if (presetFavorite) params.set("favorite", "true");
    if (presetDownloaded) params.set("downloaded", "true");
    params.set("limit", "500");

    const res = await fetch(`/api/samples?${params.toString()}`);
    const data = (await res.json()) as { samples: SampleListItem[] };
    setSamples(data.samples);
    setLoading(false);
  }, [
    query,
    typeFilter,
    categoryFilter,
    selectedTags,
    minRating,
    presetRated,
    presetFavorite,
    presetDownloaded,
  ]);

  useEffect(() => {
    void search();
  }, [search]);

  function toggleTag(tag: string) {
    const normalized = tag.toLowerCase();
    setSelectedTags((prev) =>
      prev.includes(normalized) ? prev.filter((t) => t !== normalized) : [...prev, normalized],
    );
  }

  function addTagFromInput() {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    setTagInput("");
  }

  function clearAllFilters() {
    setQuery("");
    setTypeFilter("");
    setCategoryFilter("");
    setSelectedTags([]);
    setTagInput("");
    if (!presetRated) setMinRating("");
  }

  const hasActiveFilters =
    query.trim() ||
    typeFilter ||
    categoryFilter ||
    selectedTags.length > 0 ||
    (minRating && !presetRated);

  const suggestedTags = popularTags
    .filter((t) => !selectedTags.includes(t.name))
    .slice(0, 16);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Buscar por vibe, instrumento ou nome..."
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

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          Tipo
        </span>
        {TYPE_FILTERS.map((t) => (
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
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          Formato
        </span>
        {[
          { value: "loop", label: "Loops" },
          { value: "one-shot", label: "One-shots" },
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === value ? "" : value)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              categoryFilter === value
                ? "bg-sky-600 text-white"
                : "bg-white/10 text-zinc-400 hover:bg-white/15"
            }`}
          >
            {label}
          </button>
        ))}
        {showRatingFilter && !presetRated && (
          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="ml-2 rounded-lg border border-white/10 bg-[#141418] px-3 py-1 text-xs text-zinc-300"
          >
            <option value="">Qualquer nota</option>
            <option value="5">5 estrelas</option>
            <option value="4">4+ estrelas</option>
            <option value="3">3+ estrelas</option>
          </select>
        )}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-white/10 bg-[#101014] p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            Hashtags
          </span>
          {selectedTags.length > 0 && (
            <span className="text-[10px] text-zinc-600">
              {selectedTags.length} selecionada(s) — combina todas
            </span>
          )}
        </div>
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTagFromInput();
              }
            }}
            placeholder="clap, bass, drums..."
            className="flex-1 rounded-md border border-white/10 bg-[#141418] px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={addTagFromInput}
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/15"
          >
            Adicionar
          </button>
        </div>
        {selectedTags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="flex items-center gap-1 rounded-full bg-sky-600/90 px-2.5 py-0.5 text-xs text-white"
              >
                #{tag}
                <X className="h-3 w-3 opacity-70" />
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {suggestedTags.map(({ name, count }) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleTag(name)}
              className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
            >
              #{name}
              <span className="ml-1 text-zinc-600">({count})</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-sm text-zinc-500">
        {loading ? "Buscando..." : `${samples.length} resultado(s)`}
      </p>

      {!loading && samples.length === 0 ? (
        <p className="rounded-lg border border-white/10 p-8 text-center text-sm text-zinc-500">
          Nenhum sample encontrado.
        </p>
      ) : (
        <SampleTable
          samples={samples}
          onMetaChange={search}
          onTagClick={toggleTag}
        />
      )}
    </div>
  );
}

export function SampleBrowser(props: {
  title: string;
  preset?: SampleBrowserPreset;
  showRatingFilter?: boolean;
}) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Carregando...</p>}>
      <SampleBrowserInner {...props} />
    </Suspense>
  );
}
