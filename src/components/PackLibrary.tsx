"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Upload } from "lucide-react";
import { PackCard, type PackCardData } from "@/components/PackCard";
import { parseTagsJson } from "@/lib/utils";

const GENRE_FILTERS = [
  "dubstep",
  "trap",
  "house",
  "hip-hop",
  "dnb",
  "techno",
  "rock",
  "edm",
  "pop",
];

function getPackTags(pack: PackCardData & { tags?: string }): string[] {
  const fromJson = pack.tags ? parseTagsJson(pack.tags) : [];
  const merged = [...fromJson];
  if (pack.genre && !merged.includes(pack.genre)) {
    merged.unshift(pack.genre);
  }
  return [...new Set(merged.map((t) => t.toLowerCase()))];
}

export function PackLibrary({ packs }: { packs: (PackCardData & { tags: string })[] }) {
  const [query, setQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("");

  const availableGenres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pack of packs) {
      for (const tag of getPackTags(pack)) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    const fromPacks = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const known = GENRE_FILTERS.filter((g) => counts.has(g)).map((name) => ({
      name,
      count: counts.get(name)!,
    }));
    const extra = fromPacks.filter((g) => !GENRE_FILTERS.includes(g.name));
    return [...known, ...extra];
  }, [packs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return packs.filter((pack) => {
      const tags = getPackTags(pack);
      if (genreFilter && !tags.includes(genreFilter)) return false;
      if (!q) return true;
      const haystack = [pack.name, pack.producer, pack.genre, ...tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [packs, query, genreFilter]);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sua biblioteca</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {filtered.length} de {packs.length} pack{packs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/import"
          className="flex shrink-0 items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
        >
          <Upload className="h-4 w-4" />
          Importar pack
        </Link>
      </div>

      {packs.length > 0 && (
        <>
          <div className="relative mb-4 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pack, produtor ou gênero..."
              className="w-full rounded-lg border border-white/10 bg-[#141418] py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none"
            />
          </div>

          {availableGenres.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Gênero
              </span>
              <button
                type="button"
                onClick={() => setGenreFilter("")}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  !genreFilter
                    ? "bg-sky-600 text-white"
                    : "bg-white/10 text-zinc-400 hover:bg-white/15"
                }`}
              >
                Todos
              </button>
              {availableGenres.map(({ name, count }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setGenreFilter(genreFilter === name ? "" : name)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    genreFilter === name
                      ? "bg-sky-600 text-white"
                      : "bg-white/10 text-zinc-400 hover:bg-white/15"
                  }`}
                >
                  #{name}
                  <span className="ml-1 opacity-60">({count})</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {packs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-24 text-center">
          <p className="text-lg text-zinc-400">Nenhum pack importado ainda</p>
          <p className="mt-2 max-w-md text-sm text-zinc-600">
            Faça upload de um ZIP com seu sample pack para começar.
          </p>
          <Link
            href="/admin/import"
            className="mt-6 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            Importar primeiro pack
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-white/10 p-8 text-center text-sm text-zinc-500">
          Nenhum pack encontrado com esses filtros.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((pack) => (
            <PackCard key={pack.id} pack={pack} tags={getPackTags(pack)} />
          ))}
        </div>
      )}
    </div>
  );
}
