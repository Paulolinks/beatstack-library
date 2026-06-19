import { presetKindLabel } from "@/lib/preset-kinds";
import { cn } from "@/lib/utils";

const KIND_STYLES: Record<string, string> = {
  serum1: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  serum2: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  vital: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  massive: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  presets: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export function PresetKindBadges({
  kinds,
  size = "sm",
  className,
}: {
  kinds: string[];
  size?: "sm" | "md";
  className?: string;
}) {
  if (kinds.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {kinds.map((kind) => (
        <span
          key={kind}
          className={cn(
            "rounded-full border font-medium",
            size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
            KIND_STYLES[kind] ?? "border-white/10 bg-white/[0.06] text-zinc-400",
          )}
        >
          {presetKindLabel(kind)}
        </span>
      ))}
    </div>
  );
}
