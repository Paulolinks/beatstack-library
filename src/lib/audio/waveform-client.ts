"use client";

const BARS = 200;

export async function extractPeaksFromAudioUrl(
  url: string,
  bars = BARS,
): Promise<number[]> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return extractPeaksFromBuffer(audioBuffer, bars);
  } finally {
    await audioContext.close();
  }
}

export function extractPeaksFromBuffer(
  audioBuffer: AudioBuffer,
  bars = BARS,
): number[] {
  const channel = audioBuffer.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(channel.length / bars));
  const peaks: number[] = [];

  for (let i = 0; i < bars; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channel.length);
    let peak = 0;
    let sumSquares = 0;
    let count = 0;

    for (let j = start; j < end; j++) {
      const v = Math.abs(channel[j] ?? 0);
      peak = Math.max(peak, v);
      sumSquares += v * v;
      count++;
    }

    const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
    peaks.push(peak * 0.65 + rms * 0.35);
  }

  const maxPeak = Math.max(...peaks, 0.001);
  return peaks.map((p) => Math.min(1, p / maxPeak));
}

export function isLikelyFakePeaks(peaks: number[]): boolean {
  if (peaks.length < 16) return true;
  const unique = new Set(peaks.map((p) => p.toFixed(2)));
  return unique.size < 8;
}
