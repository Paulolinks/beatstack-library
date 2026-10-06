import { SectionHeading } from "@/components/SectionHeading";

const PRODUCERS = [
  "KSHMR",
  "Virtual Riot",
  "Noisia",
  "Shadow Samples",
  "jetsonmade",
  "Murda Beatz",
  "Ovy on the Drums",
  "Travis Barker",
];

export function IndustrySection() {
  return (
    <section className="border-t border-white/5 bg-[#0a0a0c]/50 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Industry context"
          title="The Sample Library Workflow Used by Serious Producers"
        />
        <div className="mt-8 space-y-6 text-lg leading-relaxed text-zinc-400">
          <p>
            There is a reason why professional producers do not work from random folders
            on their desktop. They build libraries. They save sounds, organize ideas, and
            collect drums, loops, vocals, FX, bass shots, melodies, stems, textures,
            references, and techniques.
          </p>
          <p>
            Platforms like <strong className="text-zinc-200">Splice</strong> became popular
            because producers wanted one thing:{" "}
            <strong className="text-sky-400">
              a faster way to find the right sound at the right moment.
            </strong>
          </p>
          <p className="font-[family-name:var(--font-syne)] text-xl font-bold text-zinc-100">
            Professional producers do not just &ldquo;have samples.&rdquo; They have a system.
          </p>
          <p>
            BeatStack Manager gives you that system for your own sounds — not someone
            else&apos;s library, not another monthly subscription, not another folder full
            of forgotten files.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {PRODUCERS.map((name) => (
            <span
              key={name}
              className="rounded-full border border-white/10 bg-[#141418] px-4 py-2 text-sm text-zinc-400"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
