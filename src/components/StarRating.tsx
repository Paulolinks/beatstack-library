"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = "sm",
}: {
  value: number | null | undefined;
  onChange?: (rating: number) => void;
  size?: "sm" | "md";
}) {
  const iconSize = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          className={cn(
            "transition-colors",
            onChange ? "cursor-pointer hover:scale-110" : "cursor-default",
          )}
        >
          <Star
            className={cn(
              iconSize,
              (value ?? 0) >= star
                ? "fill-amber-400 text-amber-400"
                : "text-zinc-600",
            )}
          />
        </button>
      ))}
    </div>
  );
}
