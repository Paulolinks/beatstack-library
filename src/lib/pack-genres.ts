export const PACK_GENRE_OPTIONS = [
  { value: "", label: "Detectar automaticamente" },
  { value: "dubstep", label: "Dubstep" },
  { value: "dnb", label: "Drum & Bass" },
  { value: "trap", label: "Trap" },
  { value: "house", label: "House" },
  { value: "techno", label: "Techno" },
  { value: "hip-hop", label: "Hip-Hop" },
  { value: "rock", label: "Rock / Metal" },
  { value: "edm", label: "EDM" },
  { value: "pop", label: "Pop" },
] as const;

const GENRE_DETECT_RULES: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /\bdubstep\b|\briddim\b|\bbrostep\b|\bmelodic dubstep\b/i, tag: "dubstep" },
  { pattern: /\bdrum\s+and\s+bass\b|\bdrum\s+n\s+bass\b|\bdnb\b/i, tag: "dnb" },
  { pattern: /\btrap\b/i, tag: "trap" },
  { pattern: /\btech house\b|\bdeep house\b|\bhouse\b/i, tag: "house" },
  { pattern: /\btechno\b/i, tag: "techno" },
  { pattern: /\bhip hop\b|\bhiphop\b|\bboom bap\b/i, tag: "hip-hop" },
  { pattern: /\brock\b|\bmetal\b|\bhardcore\b|\bmetalcore\b/i, tag: "rock" },
  { pattern: /\bpop\b/i, tag: "pop" },
  { pattern: /\bedm\b|\belectronic\b/i, tag: "edm" },
];

export function normalizePackText(text: string): string {
  return text
    .replace(/\.(zip|rar|7z)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s*&\s*/gi, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferGenresFromText(text: string): string[] {
  const normalized = normalizePackText(text).toLowerCase();
  const tags: string[] = [];
  for (const rule of GENRE_DETECT_RULES) {
    if (rule.pattern.test(normalized)) tags.push(rule.tag);
  }
  return [...new Set(tags)];
}

export function inferPackMetaFromSource(sourceName: string): {
  suggestedName: string;
  producer: string | null;
  genres: string[];
  primaryGenre: string | null;
} {
  const cleaned = normalizePackText(sourceName);
  const genres = inferGenresFromText(sourceName);
  const parts = cleaned.split(/\s+/).filter(Boolean);

  let producer: string | null = null;
  if (parts.length >= 2 && parts[0].length > 2) {
    producer = `${parts[0]} ${parts[1]}`;
  } else if (parts[0]) {
    producer = parts[0];
  }

  return {
    suggestedName: cleaned,
    producer,
    genres,
    primaryGenre: genres[0] ?? null,
  };
}

export function genreLabel(value: string): string {
  return PACK_GENRE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
