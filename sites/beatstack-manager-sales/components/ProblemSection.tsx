import { SectionHeading } from "@/components/SectionHeading";

export function ProblemSection() {
  return (
    <section className="border-t border-white/5 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <SectionHeading
          eyebrow="The problem"
          title="Stop Searching. Start Producing."
        />
        <div className="mt-8 space-y-6 text-left text-lg leading-relaxed text-zinc-400">
          <p>Every producer knows this moment:</p>
          <p>
            You are in the studio. The idea is there. The vibe is perfect. You know you
            have the perfect kick, loop, bass, vocal chop, or melody somewhere…
          </p>
          <p className="font-medium text-zinc-200">But you cannot find it.</p>
          <p>
            It is buried in a folder. Inside another folder. Inside a pack you downloaded
            months ago. With a filename you do not remember.
          </p>
          <p className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6 text-zinc-300">
            By the time you find it, the creative energy is gone.
          </p>
          <p>
            <strong className="text-zinc-100">BeatStack Manager</strong> solves that
            problem. It turns your messy sample collection into a clean, visual,
            searchable, personal production library.
          </p>
        </div>
      </div>
    </section>
  );
}
