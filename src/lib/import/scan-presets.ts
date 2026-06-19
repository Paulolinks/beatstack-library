import fs from "fs";
import path from "path";

const PRESET_EXT = new Set([
  ".fxp",
  ".fxb",
  ".vital",
  ".vitalbank",
  ".vitalpreset",
  ".fst",
  ".ksd",
  ".nksf",
  ".nki",
  ".preset",
  ".sbf",
  ".aupreset",
  ".h2p",
  ".prs",
]);

const PRESET_FOLDER_PATTERN =
  /presets?|serum|vital|massive|sylenth|xfer|nexus|omnisphere|arturia|phase.?plant|surge|pigments|diva|serum2/i;

/** More specific rules first (full relative path, lowercased). */
const PRESET_KIND_FROM_PATH: Array<{ pattern: RegExp; kind: string }> = [
  { pattern: /serum\s*2|serum2|serum_2|xfer\s*serum\s*2|serum\s*ii\b/i, kind: "serum2" },
  { pattern: /serum|xfer/i, kind: "serum1" },
  { pattern: /vital/i, kind: "vital" },
  { pattern: /massive/i, kind: "massive" },
  { pattern: /sylenth/i, kind: "sylenth" },
  { pattern: /omnisphere/i, kind: "omnisphere" },
  { pattern: /nexus/i, kind: "nexus" },
  { pattern: /arturia|pigments|phase.?plant/i, kind: "arturia" },
  { pattern: /diva/i, kind: "diva" },
  { pattern: /surge/i, kind: "surge" },
];

const EXT_PRESET_KIND: Array<{ ext: string; kind: string }> = [
  { ext: ".vital", kind: "vital" },
  { ext: ".vitalbank", kind: "vital" },
  { ext: ".vitalpreset", kind: "vital" },
  { ext: ".fxp", kind: "serum1" },
  { ext: ".fxb", kind: "serum1" },
];

export interface PresetBundle {
  name: string;
  relativePath: string;
  absolutePath: string;
  fileCount: number;
  presetKind: string | null;
}

export function isPresetFile(fileName: string): boolean {
  return PRESET_EXT.has(path.extname(fileName).toLowerCase());
}

function inferPresetKind(relativePath: string, presetFilesInBundle: string[]): string | null {
  const pathNorm = relativePath.replace(/\\/g, "/");

  for (const { pattern, kind } of PRESET_KIND_FROM_PATH) {
    if (pattern.test(pathNorm)) return kind;
  }

  for (const file of presetFilesInBundle) {
    const ext = path.extname(file).toLowerCase();
    const match = EXT_PRESET_KIND.find((e) => e.ext === ext);
    if (match) {
      if (match.kind === "serum1" && /serum\s*2|serum2|serum_2/i.test(pathNorm)) {
        return "serum2";
      }
      return match.kind;
    }
  }

  if (/presets?/i.test(pathNorm)) return "presets";
  return null;
}

function countPresetFilesInDir(dir: string): number {
  let count = 0;
  function walk(d: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (isPresetFile(entry.name)) count++;
    }
  }
  walk(dir);
  return count;
}

function findPresetBundleRoot(relativeFilePath: string): string {
  const parts = relativeFilePath.replace(/\\/g, "/").split("/");
  if (parts.length <= 1) return "";

  for (let i = parts.length - 2; i >= 0; i--) {
    if (PRESET_FOLDER_PATTERN.test(parts[i])) {
      return parts.slice(0, i + 1).join("/");
    }
  }
  return parts.slice(0, -1).join("/");
}

export function scanPresetBundles(rootDir: string): PresetBundle[] {
  const presetFiles: string[] = [];

  function walk(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (isPresetFile(entry.name)) {
        presetFiles.push(path.relative(rootDir, full).replace(/\\/g, "/"));
      }
    }
  }

  walk(rootDir);

  const bundlePaths = new Map<string, string[]>();
  for (const rel of presetFiles) {
    const root = findPresetBundleRoot(rel);
    if (!root) continue;
    const list = bundlePaths.get(root) ?? [];
    list.push(rel);
    bundlePaths.set(root, list);
  }

  const bundles: PresetBundle[] = [];
  for (const [relativePath, filesInBundle] of bundlePaths) {
    const absolutePath = path.join(rootDir, ...relativePath.split("/"));
    if (!fs.existsSync(absolutePath)) continue;
    const name = relativePath.split("/").pop() || relativePath;
    bundles.push({
      name,
      relativePath,
      absolutePath,
      fileCount: filesInBundle.length,
      presetKind: inferPresetKind(relativePath, filesInBundle),
    });
  }

  return bundles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export function countAllPresetFiles(rootDir: string): number {
  let count = 0;
  function walk(d: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (isPresetFile(entry.name)) count++;
    }
  }
  walk(rootDir);
  return count;
}

export function copyDirectoryRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
