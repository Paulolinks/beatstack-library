import { X, Check } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const OLD_WAY = [
  "Random folders",
  "Messy downloads",
  "Lost samples",
  "Forgotten packs",
  "Slow workflow",
  "Broken focus",
  "Unfinished projects",
];

const BEATSTACK_WAY = [
  "Upload your sounds",
  "Preview them visually",
  "Like your favorites",
  "Rate them with stars",
  "Organize by folder",
  "Search by hashtag",
  "Move faster inside your DAW",
];

export function CompareColumns() {
  return (
    <section className="border-t border-white/5 bg-[#0a0a0c]/50 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading eyebrow="The shift" title="The Old Way vs The BeatStack Way" />
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8">
            <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold text-rose-400">
              The Old Way
            </h3>
            <ul className="mt-6 space-y-3">
              {OLD_WAY.map((item) => (
                <li key={item} className="flex items-center gap-3 text-zinc-400">
                  <X className="h-4 w-4 shrink-0 text-rose-400/80" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8">
            <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold text-emerald-400">
              The BeatStack Way
            </h3>
            <ul className="mt-6 space-y-3">
              {BEATSTACK_WAY.map((item) => (
                <li key={item} className="flex items-center gap-3 text-zinc-300">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
