import { Cloud, Database, Music2 } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const MARKET_GROUPS = [
  {
    icon: Cloud,
    title: "Monthly subscriptions",
    examples: "Splice · Loopcloud · LANDR",
    problem: "You pay every month to access someone else's library — forever.",
    accent: "rose",
  },
  {
    icon: Music2,
    title: "Cheap or free managers",
    examples: "ADSR · COSMOS · SoundQ",
    problem:
      "Often tied to cloud stores, their own ecosystem, or narrow features — not built around your personal music workflow.",
    accent: "amber",
  },
  {
    icon: Database,
    title: "Professional databases",
    examples: "BaseHead · Soundminer",
    problem:
      "Powerful, but built for film, game audio, and enterprise — overkill and expensive for music producers.",
    accent: "zinc",
  },
];

const accentBorder = {
  rose: "border-rose-500/25 bg-rose-500/5",
  amber: "border-amber-500/25 bg-amber-500/5",
  zinc: "border-white/10 bg-[#141418]",
};

const accentIcon = {
  rose: "bg-rose-500/15 text-rose-400",
  amber: "bg-amber-500/15 text-amber-400",
  zinc: "bg-zinc-500/15 text-zinc-400",
};

export function MarketPositioning() {
  return (
    <section className="border-t border-white/5 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="The market"
          title="Most Sample Tools Fall Into Three Categories"
        />

        <blockquote className="relative mt-10 overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-8 sm:p-10">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
          <p className="relative text-lg leading-relaxed text-zinc-300 sm:text-xl">
            Most sample tools are either{" "}
            <strong className="text-zinc-100">monthly subscriptions</strong>,{" "}
            <strong className="text-zinc-100">drum-only browsers</strong>, or{" "}
            <strong className="text-zinc-100">
              expensive professional sound-design databases
            </strong>
            .{" "}
            <span className="font-[family-name:var(--font-syne)] font-bold text-violet-300">
              BeatStack Manager is different:
            </span>{" "}
            it gives music producers a personal Splice-style library for their own
            samples — for one simple payment.
          </p>
        </blockquote>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {MARKET_GROUPS.map(({ icon: Icon, title, examples, problem, accent }) => (
            <div
              key={title}
              className={`rounded-2xl border p-6 ${accentBorder[accent as keyof typeof accentBorder]}`}
            >
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${accentIcon[accent as keyof typeof accentIcon]}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-zinc-100">{title}</h3>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-600">
                {examples}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500">{problem}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
          <p className="font-[family-name:var(--font-syne)] text-xl font-bold text-zinc-100 sm:text-2xl">
            Your personal library. Visual. Simple. Built for music producers.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Not a cloud store. Not a film-industry database. A clean, searchable
            workflow for the sounds you already own — upload, preview, tag, rate, and
            find the right sample when inspiration hits.
          </p>
        </div>
      </div>
    </section>
  );
}
