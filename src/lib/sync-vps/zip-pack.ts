import fs from "fs";
import path from "path";
import { ZipArchive } from "archiver";
import { getPackDir } from "@/lib/storage";

export function getDirectorySizeBytes(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) total += fs.statSync(full).size;
    }
  }
  return total;
}

export async function zipPackDirectory(
  slug: string,
  outputPath: string,
  onProgress?: (percent: number) => void,
): Promise<number> {
  const packDir = getPackDir(slug);
  if (!fs.existsSync(packDir)) {
    throw new Error(`Pasta do pack não encontrada: ${slug}`);
  }

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = new ZipArchive({ zlib: { level: 1 } });
    let totalBytes = 0;

    output.on("close", () => resolve(totalBytes));
    archive.on("error", reject);
    archive.on("progress", (data: { entries: { total: number; processed: number } }) => {
      if (data.entries.total <= 0) return;
      const percent = Math.round((data.entries.processed / data.entries.total) * 100);
      onProgress?.(percent);
    });

    archive.pipe(output);
    archive.directory(packDir, false);
    archive.finalize().then(() => {
      totalBytes = archive.pointer();
    });
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
