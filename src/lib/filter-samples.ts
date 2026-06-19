import type { SampleListItem } from "@/components/SampleRow";
import { parseTagsJson } from "@/lib/utils";

export const TYPE_FILTERS = [
  "kick",
  "snare",
  "clap",
  "hat",
  "bass",
  "guitar",
  "vocal",
  "fx",
  "perc",
  "drums",
];

export function getSampleTags(sample: SampleListItem): string[] {
  const fromJson = parseTagsJson(sample.tags);
  const extra = [sample.type, sample.instrument, sample.category, sample.genre].filter(
    Boolean,
  ) as string[];
  return [...new Set([...fromJson, ...extra].map((t) => t.toLowerCase()))];
}

export function filterSamples(
  samples: SampleListItem[],
  opts: {
    query?: string;
    typeFilter?: string;
    categoryFilter?: string;
    selectedTags?: string[];
  },
): SampleListItem[] {
  const q = opts.query?.trim().toLowerCase();
  const tags = opts.selectedTags ?? [];

  return samples.filter((sample) => {
    if (opts.typeFilter && sample.type !== opts.typeFilter) return false;
    if (opts.categoryFilter && sample.category !== opts.categoryFilter) return false;

    if (q) {
      const haystack = [
        sample.fileName,
        sample.displayName,
        sample.type,
        sample.instrument,
        sample.category,
        sample.genre,
        ...getSampleTags(sample),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (tags.length > 0) {
      const sampleTags = getSampleTags(sample);
      if (!tags.every((t) => sampleTags.includes(t.toLowerCase()))) return false;
    }

    return true;
  });
}

export function aggregateTagsFromSamples(
  samples: SampleListItem[],
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const sample of samples) {
    for (const tag of getSampleTags(sample)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
