"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SampleTable } from "@/components/SampleTable";
import { SampleFilterBar } from "@/components/SampleFilterBar";
import type { SampleListItem } from "@/components/SampleRow";
import { aggregateTagsFromSamples, filterSamples } from "@/lib/filter-samples";

type InitialSample = Omit<SampleListItem, "pack"> & {
  type: string | null;
  relativePath: string;
};

export function PackSampleList({
  initialSamples,
  pack,
}: {
  initialSamples: InitialSample[];
  pack: { id: string; name: string; slug: string; producer: string | null; coverPath: string | null };
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const allSamples = useMemo(() => {
    void refreshKey;
    return initialSamples.map((s) => ({
      ...s,
      relativePath: s.relativePath,
      pack: {
        id: pack.id,
        name: pack.name,
        slug: pack.slug,
        producer: pack.producer,
        coverPath: pack.coverPath,
      },
    })) satisfies SampleListItem[];
  }, [initialSamples, pack, refreshKey]);

  const samples = useMemo(
    () =>
      filterSamples(allSamples, {
        query,
        typeFilter,
        categoryFilter,
        selectedTags,
      }),
    [allSamples, query, typeFilter, categoryFilter, selectedTags],
  );

  const suggestedTags = useMemo(
    () =>
      aggregateTagsFromSamples(allSamples)
        .filter((t) => !selectedTags.includes(t.name))
        .slice(0, 16),
    [allSamples, selectedTags],
  );

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
  }

  const hasActiveFilters =
    Boolean(query.trim()) || Boolean(typeFilter) || Boolean(categoryFilter) || selectedTags.length > 0;

  return (
    <div>
      <div className="mb-4 relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar neste pack..."
          className="w-full rounded-lg border border-white/10 bg-[#141418] py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none"
        />
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
      />

      <p className="mb-4 text-sm text-zinc-500">{samples.length} sample(s) neste pack</p>

      <SampleTable
        samples={samples}
        onMetaChange={() => setRefreshKey((k) => k + 1)}
        onTagClick={toggleTag}
      />
    </div>
  );
}
