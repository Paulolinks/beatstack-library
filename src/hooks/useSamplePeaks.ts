"use client";

import { useEffect, useState } from "react";
import {
  extractPeaksFromAudioUrl,
  isLikelyFakePeaks,
} from "@/lib/audio/waveform-client";
import { parseWaveformPeaks } from "@/lib/utils";

export function useSamplePeaks(sampleId: string, storedPeaksJson: string | null) {
  const [peaks, setPeaks] = useState<number[]>(() =>
    parseWaveformPeaks(storedPeaksJson),
  );

  useEffect(() => {
    if (!sampleId) return;

    const stored = parseWaveformPeaks(storedPeaksJson);
    setPeaks(stored);

    if (stored.length >= 64 && !isLikelyFakePeaks(stored)) return;

    let cancelled = false;

    extractPeaksFromAudioUrl(`/api/audio/${sampleId}`)
      .then(async (realPeaks) => {
        if (cancelled) return;
        setPeaks(realPeaks);
        await fetch(`/api/samples/${sampleId}/waveform`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peaks: realPeaks }),
        });
      })
      .catch(() => {
        if (!cancelled && stored.length > 0) setPeaks(stored);
      });

    return () => {
      cancelled = true;
    };
  }, [sampleId, storedPeaksJson]);

  return { peaks };
}
