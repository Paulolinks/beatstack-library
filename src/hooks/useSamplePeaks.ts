"use client";

import { useEffect, useState } from "react";
import {
  extractPeaksFromAudioUrl,
  isLikelyFakePeaks,
} from "@/lib/audio/waveform-client";
import { parseWaveformPeaks } from "@/lib/utils";

let decodeQueue: Promise<void> = Promise.resolve();
let activeDecodes = 0;
const MAX_CONCURRENT = 3;

function enqueueDecode(task: () => Promise<void>): Promise<void> {
  decodeQueue = decodeQueue.then(async () => {
    while (activeDecodes >= MAX_CONCURRENT) {
      await new Promise((r) => setTimeout(r, 50));
    }
    activeDecodes++;
    try {
      await task();
    } finally {
      activeDecodes--;
    }
  });
  return decodeQueue;
}

export function useSamplePeaks(
  sampleId: string,
  storedPeaksJson: string | null,
  enabled = false,
) {
  const [peaks, setPeaks] = useState<number[]>(() =>
    parseWaveformPeaks(storedPeaksJson),
  );

  useEffect(() => {
    const stored = parseWaveformPeaks(storedPeaksJson);
    setPeaks(stored);

    if (!sampleId || !enabled) return;

    if (stored.length >= 64 && !isLikelyFakePeaks(stored)) return;

    let cancelled = false;

    void enqueueDecode(async () => {
      if (cancelled) return;
      try {
        const realPeaks = await extractPeaksFromAudioUrl(`/api/audio/${sampleId}`);
        if (cancelled) return;
        setPeaks(realPeaks);
        await fetch(`/api/samples/${sampleId}/waveform`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peaks: realPeaks }),
        });
      } catch {
        if (!cancelled && stored.length > 0) setPeaks(stored);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sampleId, storedPeaksJson, enabled]);

  return { peaks };
}

export function useRowVisible(ref: React.RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "80px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return visible;
}
