import { SectionHeading } from "@/components/SectionHeading";

const AUDIENCES = [
  {
    level: "Beginner",
    title: "Build professional habits from day one",
    points: [
      "Organize your sounds like a serious producer",
      "Learn what sounds you like and save your best samples",
      "Build your taste and create your personal library",
    ],
    accent: "sky",
  },
  {
    level: "Intermediate",
    title: "Speed up your workflow",
    points: [
      "Organize drums, melodies, basses, loops, vocals, and FX in one system",
      "Less searching, more creating, more finishing",
      "Stop losing momentum in the studio",
    ],
    accent: "violet",
  },
  {
    level: "Advanced",
    title: "Your command center",
    points: [
      "Searchable library for years of samples, packs, beats, and stems",
      "Hashtags for genre, BPM, energy, mood, key, and project",
      "Everything organized and ready when inspiration hits",
    ],
    accent: "emerald",
  },
];

const accentClasses = {
  sky: "border-sky-500/30 bg-sky-500/5",
  violet: "border-violet-500/30 bg-violet-500/5",
  emerald: "border-emerald-500/30 bg-emerald-500/5",
};

const badgeClasses = {
  sky: "bg-sky-500/15 text-sky-400",
  violet: "bg-violet-500/15 text-violet-400",
  emerald: "bg-emerald-500/15 text-emerald-400",
};

export function AudienceCards() {
  return (
    <section className="border-t border-white/5 bg-[#0a0a0c]/50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="For every level"
          title="Built for Beginners, Intermediate, and Advanced Producers"
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {AUDIENCES.map(({ level, title, points, accent }) => (
            <div
              key={level}
              className={`rounded-2xl border p-6 ${accentClasses[accent as keyof typeof accentClasses]}`}
            >
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${badgeClasses[accent as keyof typeof badgeClasses]}`}
              >
                {level}
              </span>
              <h3 className="mt-4 font-[family-name:var(--font-syne)] text-xl font-bold text-zinc-100">
                {title}
              </h3>
              <ul className="mt-4 space-y-3">
                {points.map((point) => (
                  <li key={point} className="flex gap-2 text-sm text-zinc-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
