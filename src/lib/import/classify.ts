export interface ClassificationResult {
  type: string | null;
  instrument: string | null;
  category: string | null;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  tags: string[];
}

const TYPE_RULES: Array<{ pattern: RegExp; value: string; tag: string }> = [
  { pattern: /\bkick\b|\bkicks\b|\b808\b|\b909\b/i, value: "kick", tag: "kick" },
  { pattern: /\bsnare\b|\bsnares\b|\brim\b|\brimshot\b/i, value: "snare", tag: "snare" },
  { pattern: /\bclap\b|\bclaps\b/i, value: "clap", tag: "clap" },
  { pattern: /\bhat\b|\bhats\b|\bhihat\b|\bhi-hat\b|\bopenhat\b|\bclosedhat\b/i, value: "hat", tag: "hat" },
  { pattern: /\bcrash\b|\bride\b|\bcymbal\b/i, value: "cymbal", tag: "cymbal" },
  { pattern: /\btom\b|\btoms\b|\bfloor\b/i, value: "tom", tag: "tom" },
  { pattern: /\bperc\b|\bpercu/i, value: "perc", tag: "perc" },
  { pattern: /\bsub\b|\b808\b|\bbass\b|\bbasses\b|\breese\b|\bgrowl\b/i, value: "bass", tag: "bass" },
  { pattern: /\bvocal\b|\bvox\b|\bvoice\b|\bacapella\b/i, value: "vocal", tag: "vocal" },
  { pattern: /\bfx\b|\beffect\b|\briser\b|\bimpact\b|\bdownlifter\b|\bsweep\b|\bnoise\b/i, value: "fx", tag: "fx" },
  { pattern: /\bpad\b|\bpads\b/i, value: "pad", tag: "pad" },
  { pattern: /\bpluck\b|\bplucks\b/i, value: "pluck", tag: "pluck" },
  { pattern: /\blead\b|\bleads\b/i, value: "lead", tag: "lead" },
  { pattern: /\bstab\b|\bstabs\b/i, value: "stab", tag: "stab" },
];

const INSTRUMENT_RULES: Array<{ pattern: RegExp; value: string; tag: string }> = [
  { pattern: /\bguitar\b|\bguitars\b|\briff\b|\bchug\b|\bdjent\b/i, value: "guitar", tag: "guitar" },
  { pattern: /\bpiano\b|\bkeys\b|\bkeyboard\b/i, value: "piano", tag: "piano" },
  { pattern: /\bsynth\b|\bsynths\b|\barp\b/i, value: "synth", tag: "synth" },
  { pattern: /\bstring\b|\bstrings\b|\borchestr/i, value: "strings", tag: "strings" },
  { pattern: /\bbrass\b|\bhorn\b|\btrumpet\b/i, value: "brass", tag: "brass" },
  { pattern: /\bdrum\b|\bdrums\b|\bkit\b/i, value: "drums", tag: "drums" },
];

const CATEGORY_RULES: Array<{ pattern: RegExp; value: string; tag: string }> = [
  { pattern: /\bloop\b|\bloops\b|\bloop_/i, value: "loop", tag: "loop" },
  { pattern: /\bone.?shot\b|\boneshot\b|\bshot\b|\bhit\b/i, value: "one-shot", tag: "one-shot" },
  { pattern: /\bstem\b|\bstems\b/i, value: "stem", tag: "stem" },
  { pattern: /\bmidi\b/i, value: "midi", tag: "midi" },
];

const GENRE_RULES: Array<{ pattern: RegExp; value: string; tag: string }> = [
  { pattern: /\bdubstep\b|\b riddim\b|\bbrostep\b/i, value: "dubstep", tag: "dubstep" },
  { pattern: /\btrap\b/i, value: "trap", tag: "trap" },
  { pattern: /\bhouse\b|\btech house\b|\bdeep house\b/i, value: "house", tag: "house" },
  { pattern: /\btechno\b/i, value: "techno", tag: "techno" },
  { pattern: /\bdrum.?and.?bass\b|\bdnb\b|\bdrum n bass\b/i, value: "dnb", tag: "dnb" },
  { pattern: /\brock\b|\bmetal\b|\bhardcore\b|\bmetalcore\b/i, value: "rock", tag: "rock" },
  { pattern: /\bhip.?hop\b|\bhiphop\b|\bboom bap\b/i, value: "hip-hop", tag: "hip-hop" },
  { pattern: /\bpop\b/i, value: "pop", tag: "pop" },
  { pattern: /\bedm\b|\belectronic\b/i, value: "edm", tag: "edm" },
];

import { parseBpmKeyFromText } from "@/lib/sample-metadata";

function matchFirst(
  text: string,
  rules: Array<{ pattern: RegExp; value: string; tag: string }>,
): { value: string | null; tags: string[] } {
  const tags: string[] = [];
  let value: string | null = null;
  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      if (!value) value = rule.value;
      tags.push(rule.tag);
    }
  }
  return { value, tags };
}

export function classifySample(relativePath: string, fileName: string): ClassificationResult {
  const text = `${relativePath} ${fileName}`.replace(/\\/g, "/");
  const textLower = text.toLowerCase();

  const typeResult = matchFirst(textLower, TYPE_RULES);
  const instrumentResult = matchFirst(textLower, INSTRUMENT_RULES);
  const categoryResult = matchFirst(textLower, CATEGORY_RULES);
  const genreResult = matchFirst(textLower, GENRE_RULES);
  const { bpm, key } = parseBpmKeyFromText(text);

  const tags = [
    ...new Set([
      ...typeResult.tags,
      ...instrumentResult.tags,
      ...categoryResult.tags,
      ...genreResult.tags,
    ]),
  ];

  return {
    type: typeResult.value,
    instrument: instrumentResult.value,
    category: categoryResult.value,
    genre: genreResult.value,
    bpm,
    key,
    tags,
  };
}

export function buildDisplayName(
  packName: string,
  fileName: string,
  classification: ClassificationResult,
): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const hasProducerHint = /[a-z]{3,}/i.test(base) && base.length > 8;
  if (hasProducerHint) return fileName;

  const parts = [packName.replace(/\s+/g, "_")];
  if (classification.type) parts.push(classification.type);
  parts.push(base);
  return parts.join("_") + pathExt(fileName);
}

function pathExt(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot) : "";
}

export function buildSearchText(
  packName: string,
  producer: string | null,
  fileName: string,
  displayName: string,
  classification: ClassificationResult,
): string {
  return [
    packName,
    producer,
    fileName,
    displayName,
    classification.type,
    classification.instrument,
    classification.category,
    classification.genre,
    classification.key,
    classification.bpm?.toString(),
    ...classification.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function inferPackMeta(packFolderName: string): {
  name: string;
  producer: string | null;
  genre: string | null;
  tags: string[];
} {
  const cleaned = packFolderName.replace(/[-_]+/g, " ").trim();
  const genreResult = matchFirst(cleaned, GENRE_RULES);

  const parts = cleaned.split(/\s+/);
  const producer =
    parts.length >= 2 && parts[0].length > 2 ? parts.slice(0, 2).join(" ") : parts[0] || null;

  return {
    name: cleaned || packFolderName,
    producer,
    genre: genreResult.value,
    tags: genreResult.tags,
  };
}
