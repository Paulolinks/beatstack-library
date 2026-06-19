"use client";

export async function extractPeaksFromAudioUrl(
  url: string,
  bars = 128,
): Promise<number[]> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const channel = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channel.length / bars));
    const peaks: number[] = [];

    for (let i = 0; i < bars; i++) {
      let peak = 0;
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channel.length);
      for (let j = start; j < end; j++) {
        peak = Math.max(peak, Math.abs(channel[j] ?? 0));
      }
      peaks.push(peak);
    }

    const maxPeak = Math.max(...peaks, 0.001);
    return peaks.map((p) => p / maxPeak);
  } finally {
    await audioContext.close();
  }
}

export function isLikelyFakePeaks(peaks: number[]): boolean {
  if (peaks.length < 16) return true;
  const unique = new Set(peaks.map((p) => p.toFixed(2)));
  return unique.size < 8;
}
