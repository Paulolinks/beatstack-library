"use client";

import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

export function Waveform({
  peaks,
  progress = 0,
  playing = false,
  interactive = false,
  onSeek,
  className,
  height = 28,
}: {
  peaks: number[];
  progress?: number;
  playing?: boolean;
  interactive?: boolean;
  onSeek?: (ratio: number) => void;
  className?: string;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const displayPeaks = useMemo(() => {
    if (peaks.length >= 32) return peaks;
    return Array.from({ length: 96 }, (_, i) => 0.08 + Math.abs(Math.sin(i * 0.22)) * 0.35);
  }, [peaks]);

  const barCount = displayPeaks.length;
  const width = barCount * 3;

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!interactive || !onSeek || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio);
  }

  const centerY = height / 2;
  const progressX = progress * width;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn(
        "h-7 w-full min-w-[120px]",
        interactive && "cursor-pointer",
        className,
      )}
      onClick={handleClick}
      role={interactive ? "slider" : undefined}
    >
      {displayPeaks.map((peak, i) => {
        const barW = Math.max(1.5, width / barCount - 0.5);
        const x = (i / barCount) * width;
        const amplitude = Math.max(0.06, peak) * (height / 2 - 1);
        const barCenter = x + barW / 2;
        const played = playing && barCenter <= progressX;

        return (
          <rect
            key={i}
            x={x}
            y={centerY - amplitude}
            width={barW}
            height={amplitude * 2}
            rx={0.5}
            className={played ? "fill-sky-400" : "fill-zinc-500"}
          />
        );
      })}
    </svg>
  );
}
