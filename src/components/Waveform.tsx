"use client";

import { cn } from "@/lib/utils";

export function Waveform({
  peaks,
  progress = 0,
  playing = false,
  interactive = false,
  onSeek,
  className,
  barClassName,
  activeBarClassName,
}: {
  peaks: number[];
  progress?: number;
  playing?: boolean;
  interactive?: boolean;
  onSeek?: (ratio: number) => void;
  className?: string;
  barClassName?: string;
  activeBarClassName?: string;
}) {
  const displayPeaks =
    peaks.length > 0
      ? peaks
      : Array.from({ length: 64 }, (_, i) => 0.2 + Math.abs(Math.sin(i * 0.3)) * 0.3);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!interactive || !onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio);
  }

  return (
    <div
      className={cn(
        "flex h-7 items-end gap-[1px]",
        interactive && "cursor-pointer",
        className,
      )}
      onClick={handleClick}
      role={interactive ? "slider" : undefined}
    >
      {displayPeaks.map((peak, i) => {
        const pct = i / displayPeaks.length;
        const active = playing && pct <= progress;
        return (
          <div
            key={i}
            className={cn(
              "min-w-[2px] flex-1 rounded-[1px] transition-colors",
              active
                ? activeBarClassName ?? "bg-sky-400"
                : barClassName ?? "bg-zinc-600",
            )}
            style={{ height: `${Math.max(12, peak * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
