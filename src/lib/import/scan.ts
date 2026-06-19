import fs from "fs";
import path from "path";
import { parseFile } from "music-metadata";

const AUDIO_EXT = new Set([".wav", ".mp3", ".aiff", ".aif", ".flac", ".ogg", ".m4a"]);

export interface ScannedAudioFile {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  durationMs: number | null;
  waveformPeaks: number[];
}

export function isAudioFile(fileName: string): boolean {
  return AUDIO_EXT.has(path.extname(fileName).toLowerCase());
}

export function scanAudioFiles(rootDir: string): ScannedAudioFile[] {
  const results: ScannedAudioFile[] = [];

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
      } else if (isAudioFile(entry.name)) {
        results.push({
          absolutePath: full,
          relativePath: path.relative(rootDir, full).replace(/\\/g, "/"),
          fileName: entry.name,
          durationMs: null,
          waveformPeaks: [],
        });
      }
    }
  }

  walk(rootDir);
  return results;
}

export async function enrichAudioMetadata(file: ScannedAudioFile): Promise<ScannedAudioFile> {
  try {
    const metadata = await parseFile(file.absolutePath, { duration: true });
    const durationMs = metadata.format.duration
      ? Math.round(metadata.format.duration * 1000)
      : null;
    return {
      ...file,
      durationMs,
      waveformPeaks: generateSimplePeaks(durationMs),
    };
  } catch {
    return {
      ...file,
      waveformPeaks: generateSimplePeaks(null),
    };
  }
}

function generateSimplePeaks(durationMs: number | null, bars = 48): number[] {
  const seed = durationMs ?? 1000;
  const peaks: number[] = [];
  for (let i = 0; i < bars; i++) {
    const wave = Math.abs(Math.sin((i + 1) * 0.7 + seed * 0.001));
    const noise = ((i * 17 + seed) % 100) / 200;
    peaks.push(Math.min(1, 0.15 + wave * 0.55 + noise));
  }
  return peaks;
}

export async function scanAndEnrichAudio(rootDir: string): Promise<ScannedAudioFile[]> {
  const files = scanAudioFiles(rootDir);
  const batchSize = 20;
  const enriched: ScannedAudioFile[] = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(enrichAudioMetadata));
    enriched.push(...results);
  }

  return enriched;
}
