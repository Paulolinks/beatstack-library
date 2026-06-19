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

export function inferPackNameFromArchive(fileName: string): string {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/[-_]+/g, " ")
    .trim();
}
