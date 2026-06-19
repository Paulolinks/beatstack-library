export const PRESET_KIND_LABELS: Record<string, string> = {
  serum1: "Serum",
  serum2: "Serum 2",
  vital: "Vital",
  massive: "Massive",
  sylenth: "Sylenth",
  omnisphere: "Omnisphere",
  nexus: "Nexus",
  arturia: "Arturia",
  diva: "Diva",
  surge: "Surge",
  presets: "Presets",
};

const PRESET_KIND_ORDER = [
  "serum1",
  "serum2",
  "vital",
  "massive",
  "sylenth",
  "omnisphere",
  "nexus",
  "arturia",
  "diva",
  "surge",
  "presets",
];

export function presetKindLabel(kind: string | null | undefined): string {
  if (!kind) return "Presets";
  return PRESET_KIND_LABELS[kind] ?? kind;
}

export function sortPresetKinds(kinds: string[]): string[] {
  const unique = [...new Set(kinds.filter(Boolean))];
  return unique.sort((a, b) => {
    const ai = PRESET_KIND_ORDER.indexOf(a);
    const bi = PRESET_KIND_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function uniquePresetKinds(
  assets: { presetKind: string | null }[],
): string[] {
  return sortPresetKinds(
    assets.map((a) => a.presetKind).filter((k): k is string => Boolean(k)),
  );
}
