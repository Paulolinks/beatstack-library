import {
  FolderOpen,
  Hash,
  Heart,
  Play,
  Search,
  Star,
  Upload,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const FEATURES = [
  {
    icon: Upload,
    title: "Upload your samples",
    description: "Import your packs and sounds into one organized library on your PC.",
  },
  {
    icon: FolderOpen,
    title: "Create folders",
    description: "Build project folders and organize drums, loops, vocals, FX, and more.",
  },
  {
    icon: Hash,
    title: "Add hashtags",
    description: "Tag by genre, BPM, mood, key, instrument, or any system you want.",
  },
  {
    icon: Star,
    title: "Rate with stars",
    description: "Mark your best files so you always know what to reach for first.",
  },
  {
    icon: Heart,
    title: "Like favorites",
    description: "Save your favorite sounds into dedicated folders instantly.",
  },
  {
    icon: Search,
    title: "Search fast",
    description: "Find the right sound in seconds — not after digging through folders.",
  },
  {
    icon: Play,
    title: "Preview instantly",
    description: "Listen to beats, loops, drums, vocals, and FX before you drag to your DAW.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="border-t border-white/5 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Features"
          title="Everything You Need to Manage Your Library"
          subtitle="BeatStack Manager was built for producers who are tired of wasting time looking for sounds."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-white/10 bg-[#141418] p-6 transition hover:border-violet-500/40 hover:bg-[#18181d]"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 transition group-hover:bg-sky-500/25">
                <Icon className="h-5 w-5 text-sky-400" />
              </div>
              <h3 className="font-semibold text-zinc-100">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
