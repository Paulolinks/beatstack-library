"use client";

import { useMemo, useState } from "react";
import { SampleRow, type SampleListItem } from "@/components/SampleRow";

type InitialSample = Omit<SampleListItem, "pack"> & { type: string | null };

export function PackSampleList({
  initialSamples,
  pack,
}: {
  initialSamples: InitialSample[];
  pack: { id: string; name: string; slug: string; producer: string | null; coverPath: string | null };
}) {
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  const samples = useMemo(() => {
    const mapped = initialSamples.map((s) => ({
      ...s,
      pack: {
        id: pack.id,
        name: pack.name,
        slug: pack.slug,
        producer: pack.producer,
        coverPath: pack.coverPath,
      },
    }));
    if (!typeFilter) return mapped;
    return mapped.filter((s) => s.type === typeFilter);
  }, [initialSamples, pack, typeFilter, refreshKey]);

  const types = [...new Set(initialSamples.map((s) => s.type).filter(Boolean))] as string[];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTypeFilter("")}
          className={`rounded-full px-3 py-1 text-xs uppercase ${
            !typeFilter ? "bg-violet-600 text-white" : "bg-white/10 text-zinc-400"
          }`}
        >
          Todos
        </button>
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`rounded-full px-3 py-1 text-xs uppercase ${
              typeFilter === t ? "bg-violet-600 text-white" : "bg-white/10 text-zinc-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-[#141418]/50">
        {samples.map((sample) => (
          <SampleRow
            key={sample.id}
            sample={sample}
            onMetaChange={() => setRefreshKey((k) => k + 1)}
          />
        ))}
      </div>
    </div>
  );
}
