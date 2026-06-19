"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { SampleTable } from "@/components/SampleTable";
import { SampleFilterBar } from "@/components/SampleFilterBar";
import type { SampleListItem } from "@/components/SampleRow";
import type { CopyFolder } from "@/lib/download-sample-client";

export type SampleBrowserPreset = {
  rated?: boolean;
  favorite?: boolean;
  downloaded?: boolean;
  copyFolder?: CopyFolder;
};

function SampleBrowserInner({
  title,
  preset,
  showRatingFilter = true,
  hideTitle = false,
}: {
  title: string;
  preset?: SampleBrowserPreset;
  showRatingFilter?: boolean;
  hideTitle?: boolean;
}) {
  const searchParams = useSearchParams();
  const presetRated = preset?.rated ?? false;
  const presetFavorite = preset?.favorite ?? false;
  const presetDownloaded = preset?.downloaded ?? false;
  const copyFolder = preset?.copyFolder ?? (presetFavorite ? "likes" : presetDownloaded ? "copied" : "downloads");

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

  const hasActiveFilters = Boolean(
    query.trim() ||
      typeFilter ||
      categoryFilter ||
      selectedTags.length > 0 ||
      (minRating && !presetRated),
  );

  const suggestedTags = popularTags
    .filter((t) => !selectedTags.includes(t.name))
    .slice(0, 16);

  return (
    <div>
      {!hideTitle && (
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
      )}

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

      <SampleFilterBar
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
        tagInput={tagInput}
        onTagInputChange={setTagInput}
        onAddTag={addTagFromInput}
        suggestedTags={suggestedTags}
        onClearAll={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
        showRatingFilter={showRatingFilter && !presetRated}
        minRating={minRating}
        onMinRatingChange={setMinRating}
      />

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
          copyFolder={copyFolder}
        />
      )}
    </div>
  );
}

export function SampleBrowser(props: {
  title: string;
  preset?: SampleBrowserPreset;
  showRatingFilter?: boolean;
  hideTitle?: boolean;
}) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Carregando...</p>}>
      <SampleBrowserInner {...props} />
    </Suspense>
  );
}
