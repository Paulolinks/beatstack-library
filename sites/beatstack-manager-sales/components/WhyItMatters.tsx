import { SectionHeading } from "@/components/SectionHeading";

const HIGHLIGHTS = [
  "Your favorite drums",
  "Your best loops",
  "Your strongest basses",
  "Your most useful vocals",
  "Your cleanest FX",
  "Your highest-rated samples",
];

export function WhyItMatters() {
  return (
    <section className="border-t border-white/5 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <SectionHeading eyebrow="Why it matters" title="Music Production Is Decision-Making" />
        <div className="mt-8 space-y-6 text-lg leading-relaxed text-zinc-400">
          <p>
            The faster you find the right sound, the faster you make decisions. The faster
            you make decisions, the faster you create. And the faster you create, the more
            music you finish.
          </p>
          <p>
            BeatStack Manager helps you create a personal sound library that works like
            your creative memory.
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {HIGHLIGHTS.map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#141418] px-4 py-3"
            >
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 to-violet-400" />
              <span className="text-sm text-zinc-300">{item}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center font-[family-name:var(--font-syne)] text-xl font-bold text-zinc-100">
          Everything organized. Everything searchable. Everything ready.
        </p>
      </div>
    </section>
  );
}
