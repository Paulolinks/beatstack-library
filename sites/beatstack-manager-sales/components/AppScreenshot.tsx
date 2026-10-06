import Image from "next/image";
import { Waveform } from "@/components/Waveform";

export function AppScreenshot() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-violet-600/25 to-indigo-600/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60 ring-1 ring-white/5">
        <Image
          src="/screenshots/app-library.png"
          alt="BeatStack Manager — sample library with packs, search, and waveform preview"
          width={1920}
          height={1080}
          className="h-auto w-full"
          priority
        />
      </div>
      <div className="mt-5 flex justify-center">
        <Waveform className="h-10 opacity-50" />
      </div>
    </div>
  );
}
