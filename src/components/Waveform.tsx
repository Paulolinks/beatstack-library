"use client";

import { cn } from "@/lib/utils";

export function Waveform({
  peaks,
  progress = 0,
  playing = false,
  className,
}: {
  peaks: number[];
  progress?: number;
  playing?: boolean;
  className?: string;
}) {
  if (!peaks.length) {
    return (
      <div className={cn("flex h-8 items-end gap-px", className)}>
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="w-0.5 flex-1 rounded-sm bg-zinc-700"
            style={{ height: `${20 + (i % 5) * 8}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex h-8 items-end gap-px", className)}>
      {peaks.map((peak, i) => {
        const pct = i / peaks.length;
        const active = playing && pct <= progress;
        return (
          <div
            key={i}
            className={cn(
              "w-0.5 flex-1 rounded-sm transition-colors",
              active ? "bg-violet-400" : "bg-zinc-600",
            )}
            style={{ height: `${Math.max(8, peak * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
