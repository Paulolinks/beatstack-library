import {
  FolderOpen,
  Hash,
  Heart,
  Music2,
  Play,
  Search,
  Star,
  Upload,
} from "lucide-react";

const PACKS = [
  { name: "Dark Trap Drums", count: 48, color: "from-violet-600/40 to-violet-900/60" },
  { name: "Melodic Loops", count: 124, color: "from-sky-600/40 to-sky-900/60" },
  { name: "808 Collection", count: 36, color: "from-rose-600/30 to-rose-900/50" },
  { name: "Vocal Chops", count: 72, color: "from-amber-600/30 to-amber-900/50" },
];

const SAMPLES = [
  { name: "Kick_Heavy_01.wav", tags: ["#trap", "#808"], rating: 5 },
  { name: "Melody_Emotional_Cm.wav", tags: ["#melody", "#lofi"], rating: 4 },
  { name: "HiHat_Roll_Fast.wav", tags: ["#drums"], rating: 5 },
];

export function AppMockup() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0c] shadow-2xl shadow-black/50">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#141418] px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-rose-500/80" />
          <div className="h-3 w-3 rounded-full bg-amber-500/80" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
        </div>
        <span className="ml-2 text-xs text-zinc-500">BeatStack Manager</span>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-44 shrink-0 border-r border-white/10 bg-[#0d0d0f] p-3 sm:block">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Library
          </p>
          {["All Packs", "Favorites", "Liked", "Top Rated"].map((item, i) => (
            <div
              key={item}
              className={`mb-1 rounded-lg px-2 py-1.5 text-xs ${
                i === 0 ? "bg-sky-500/15 text-sky-400" : "text-zinc-500"
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1 p-4">
          {/* Search bar */}
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-[#141418] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-zinc-600" />
            <span className="truncate text-xs text-zinc-600">Search samples, tags, packs…</span>
          </div>

          {/* Pack grid */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PACKS.map((pack) => (
              <div
                key={pack.name}
                className="overflow-hidden rounded-lg border border-white/10 bg-[#141418]"
              >
                <div
                  className={`flex aspect-square items-center justify-center bg-gradient-to-br ${pack.color}`}
                >
                  <Music2 className="h-6 w-6 text-white/40" />
                </div>
                <div className="p-2">
                  <p className="truncate text-[10px] font-medium text-zinc-300">{pack.name}</p>
                  <p className="text-[9px] text-zinc-600">{pack.count} samples</p>
                </div>
              </div>
            ))}
          </div>

          {/* Sample rows */}
          <div className="space-y-1.5">
            {SAMPLES.map((sample) => (
              <div
                key={sample.name}
                className="flex items-center gap-2 rounded-lg border border-white/5 bg-[#141418]/80 px-2 py-1.5"
              >
                <button
                  type="button"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20"
                  aria-hidden
                >
                  <Play className="h-3 w-3 fill-sky-400 text-sky-400" />
                </button>
                <span className="min-w-0 flex-1 truncate text-[10px] text-zinc-300">
                  {sample.name}
                </span>
                <div className="hidden items-center gap-0.5 sm:flex">
                  {Array.from({ length: sample.rating }).map((_, i) => (
                    <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                {sample.tags.map((tag) => (
                  <span
                    key={tag}
                    className="hidden rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] text-violet-300 sm:inline"
                  >
                    {tag}
                  </span>
                ))}
                <Heart className="h-3 w-3 shrink-0 text-rose-500/60" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 border-t border-white/10 bg-[#0d0d0f] px-4 py-3">
        {[
          { icon: Upload, label: "Upload" },
          { icon: FolderOpen, label: "Folders" },
          { icon: Hash, label: "Hashtags" },
          { icon: Star, label: "Stars" },
        ].map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500"
          >
            <Icon className="h-3 w-3" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
