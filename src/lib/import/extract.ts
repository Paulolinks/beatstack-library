import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

const COVER_NAMES = [
  "cover.jpg",
  "cover.png",
  "cover.webp",
  "folder.jpg",
  "folder.png",
  "artwork.jpg",
  "artwork.png",
  "pack.jpg",
  "pack.png",
];

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export function extractZip(archivePath: string, destDir: string): void {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const zip = new AdmZip(archivePath);
  zip.extractAllTo(destDir, true);
}

export function findCoverImage(rootDir: string): string | null {
  for (const name of COVER_NAMES) {
    const candidate = path.join(rootDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }

  let bestPath: string | null = null;
  let bestSize = 0;

  function walk(dir: string, depth: number): void {
    if (depth > 3) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) {
        const stat = fs.statSync(full);
        if (stat.size > bestSize) {
          bestSize = stat.size;
          bestPath = full;
        }
      }
    }
  }

  walk(rootDir, 0);
  return bestPath;
}

export function copyCoverToPack(coverSource: string, packDir: string): string {
  const ext = path.extname(coverSource).toLowerCase() || ".jpg";
  const dest = path.join(packDir, `cover${ext}`);
  fs.copyFileSync(coverSource, dest);
  return dest;
}

const COVER_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function savePackCoverFromBuffer(
  packDir: string,
  buffer: Buffer,
  mimeType: string,
  fileName?: string,
): string {
  const ext =
    COVER_EXT_BY_MIME[mimeType] ??
    (path.extname(fileName ?? "").toLowerCase() || ".jpg");
  const dest = path.join(packDir, `cover${ext}`);
  fs.writeFileSync(dest, buffer);
  return dest;
}

export function inferPackNameFromArchive(fileName: string): string {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/[-_]+/g, " ")
    .trim();
}

export function inferPackNameFromFolderPaths(paths: string[]): string {
  if (paths.length === 0) return "Sample Pack";
  const first = paths[0].replace(/\\/g, "/");
  const parts = first.split("/").filter(Boolean);
  if (parts.length > 1) {
    return parts[0].replace(/[-_]+/g, " ").trim();
  }
  return inferPackNameFromArchive(parts[0] || "Sample Pack");
}

export async function extractRar(archivePath: string, destDir: string): Promise<void> {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const { createExtractorFromFile } = await import("node-unrar-js");
  const extractor = await createExtractorFromFile({
    filepath: archivePath,
    targetPath: destDir,
  });
  const extracted = extractor.extract();
  for (const _entry of extracted.files) {
    /* esvaziar iterator — extracao lazy */
  }
}

export async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  const ext = path.extname(archivePath).toLowerCase();
  if (ext === ".zip") {
    extractZip(archivePath, destDir);
    return;
  }
  if (ext === ".rar") {
    await extractRar(archivePath, destDir);
    return;
  }
  throw new Error(
    `Formato "${ext || "desconhecido"}" não suportado. Use .zip ou .rar, ou envie uma pasta.`,
  );
}

export function writeFolderFilesToDir(
  files: { buffer: Buffer; relativePath: string }[],
  destDir: string,
): void {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  for (const { buffer, relativePath } of files) {
    const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalized) continue;
    const dest = path.join(destDir, ...normalized.split("/"));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buffer);
  }
}
