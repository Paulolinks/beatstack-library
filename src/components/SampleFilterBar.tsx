"use client";

import { X } from "lucide-react";
import { TYPE_FILTERS } from "@/lib/filter-samples";

export function SampleFilterBar({
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  selectedTags,
  onToggleTag,
  tagInput,
  onTagInputChange,
  onAddTag,
  suggestedTags,
  onClearAll,
  hasActiveFilters,
  showRatingFilter = false,
  minRating = "",
  onMinRatingChange,
}: {
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  suggestedTags: { name: string; count: number }[];
  onClearAll: () => void;
  hasActiveFilters: boolean;
  showRatingFilter?: boolean;
  minRating?: string;
  onMinRatingChange?: (value: string) => void;
}) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          Tipo
        </span>
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTypeFilterChange(typeFilter === t ? "" : t)}
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
            onClick={() => onCategoryFilterChange(categoryFilter === value ? "" : value)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              categoryFilter === value
                ? "bg-sky-600 text-white"
                : "bg-white/10 text-zinc-400 hover:bg-white/15"
            }`}
          >
            {label}
          </button>
        ))}
        {showRatingFilter && onMinRatingChange && (
          <select
            value={minRating}
            onChange={(e) => onMinRatingChange(e.target.value)}
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
            onClick={onClearAll}
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
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddTag();
              }
            }}
            placeholder="clap, bass, drums..."
            className="flex-1 rounded-md border border-white/10 bg-[#141418] px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={onAddTag}
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
                onClick={() => onToggleTag(tag)}
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
              onClick={() => onToggleTag(name)}
              className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
            >
              #{name}
              <span className="ml-1 text-zinc-600">({count})</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
