/** Extrai BPM e key de nomes de arquivo de sample packs (ex: 140_Fmajor, 128_Amin). */

export function parseBpmKeyFromText(text: string): {
  bpm: number | null;
  key: string | null;
} {
  const normalized = text.replace(/\\/g, "/");

  let bpm: number | null = null;
  let key: string | null = null;

  const bpmKeyPatterns = [
    /(?:^|[_\-\s])(\d{2,3})[_\-\s]+([A-G][#b]?(?:maj|min|major|minor|m))(?:[_\-\s]|$)/i,
    /(?:^|[_\-\s])(\d{2,3})([A-G][#b]?(?:maj|min|major|minor))(?:[_\-\s]|$)/i,
    /(?:^|[_\-\s])(\d{2,3})[_\-\s]+([A-G][#b]?)(?:[_\-\s]|$)/i,
  ];

  for (const pattern of bpmKeyPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1] && match?.[2]) {
      const candidate = parseInt(match[1], 10);
      if (isValidBpm(candidate)) {
        bpm = candidate;
        key = normalizeKey(match[2]);
        break;
      }
    }
  }

  if (!bpm) {
    const bpmOnlyPatterns = [
      /\b(\d{2,3})\s*bpm\b/i,
      /\bbpm\s*(\d{2,3})\b/i,
      /(?:^|[_\-\s])(\d{2,3})bpm(?:[_\-\s]|$)/i,
      /(?:^|[_\-\s])(\d{2,3})(?=[_\-\s]+[A-G#b])/i,
    ];
    for (const pattern of bpmOnlyPatterns) {
      const match = normalized.match(pattern);
      if (match?.[1]) {
        const candidate = parseInt(match[1], 10);
        if (isValidBpm(candidate)) {
          bpm = candidate;
          break;
        }
      }
    }
  }

  if (!key) {
    const keyPatterns = [
      /(?:^|[_\-\s])([A-G][#b]?)_(maj|min|major|minor|m)(?:[_\-\s]|$)/i,
      /(?:^|[_\-\s])([A-G][#b]?)(maj|min|major|minor)(?:[_\-\s]|$)/i,
      /\b([A-G][#b]?)_(maj|min|major|minor)\b/i,
      /\b([A-G][#b]?\s*(?:maj|min|major|minor|m))\b/i,
      /\b([A-G][#b]?m)\b/,
    ];
    for (const pattern of keyPatterns) {
      const match = normalized.match(pattern);
      if (match?.[1]) {
        key = normalizeKey(match[1] + (match[2] ?? ""));
        if (key) break;
      }
    }
  }

  return { bpm, key };
}

export function parseBpmKeyFromFileName(fileName: string): {
  bpm: number | null;
  key: string | null;
} {
  const base = fileName.replace(/\.[^.]+$/, "");
  return parseBpmKeyFromText(base);
}

export function resolveSampleBpm(
  stored: number | null | undefined,
  fileName: string,
  relativePath?: string,
): number | null {
  if (stored != null) return stored;
  const fromName = parseBpmKeyFromFileName(fileName);
  if (fromName.bpm) return fromName.bpm;
  if (relativePath) {
    return parseBpmKeyFromText(relativePath).bpm;
  }
  return null;
}

export function resolveSampleKey(
  stored: string | null | undefined,
  fileName: string,
  relativePath?: string,
): string | null {
  if (stored) return stored;
  const fromName = parseBpmKeyFromFileName(fileName);
  if (fromName.key) return fromName.key;
  if (relativePath) {
    return parseBpmKeyFromText(relativePath).key;
  }
  return null;
}

function isValidBpm(n: number): boolean {
  return n >= 40 && n <= 999;
}

function normalizeKey(raw: string): string | null {
  const cleaned = raw.trim().replace(/\s+/g, "");
  if (!cleaned) return null;

  const match = cleaned.match(/^([A-G][#b]?)(maj|min|major|minor|m)?$/i);
  if (!match) return null;

  const note = match[1];
  const quality = (match[2] ?? "").toLowerCase();

  if (!quality || quality === "maj" || quality === "major") {
    return note;
  }
  if (quality === "m" || quality === "min" || quality === "minor") {
    return `${note}m`;
  }
  return note;
}
