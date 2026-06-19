import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseTagsJson(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function parseWaveformPeaks(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => (typeof p === "number" ? p : parseFloat(String(p)) || 0.3));
  } catch {
    return [];
  }
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "—";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) return `${m}:${s.toString().padStart(2, "0")}`;
  return `0:${s.toString().padStart(2, "0")}`;
}

export function formatKey(key: string | null | undefined): string {
  if (!key) return "—";
  if (/m$/i.test(key) && key.length <= 3) {
    return `${key.slice(0, -1)} min`;
  }
  if (/min/i.test(key)) return key.replace(/min/i, "min");
  return `${key} maj`;
}

export function formatBpm(bpm: number | null | undefined): string {
  return bpm ? `${bpm} BPM` : "";
}
