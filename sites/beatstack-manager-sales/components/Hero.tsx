import { CheckoutButton, checkoutLabel } from "@/components/CheckoutButton";
import { AppScreenshot } from "@/components/AppScreenshot";
import { HeroWaveBackground } from "@/components/HeroWaveBackground";
import { LAUNCH_PRICE } from "@/lib/config";

const GENRE_TAGS = [
  "Trap",
  "Hip-hop",
  "Dubstep",
  "House",
  "Techno",
  "EDM",
  "Lo-fi",
  "Bass",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="gradient-mesh noise-bg absolute inset-0" />
      <HeroWaveBackground />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
          <div className="animate-fade-up">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300">
              Launch offer — ${LAUNCH_PRICE} one-time
            </p>

            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              BeatStack Manager
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-syne)] text-3xl font-extrabold leading-[1.15] tracking-tight text-zinc-50 sm:text-4xl lg:text-[2.75rem]">
              Your personal{" "}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                Splice
              </span>
              <br />
              for your own samples
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
              Upload your samples. Organize your sounds. Search fast. Preview beats,
              loops, drums, vocals, and FX — then move the right sounds into your DAW
              when you are ready to create.
            </p>

            <div className="mt-9 flex flex-col items-start gap-3">
              <CheckoutButton size="hero">{checkoutLabel()}</CheckoutButton>
              <p className="text-sm text-zinc-500">
                One-time payment · No subscription
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-2">
              {GENRE_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div
            className="relative animate-fade-up lg:pl-2"
            style={{ animationDelay: "0.15s" }}
          >
            <AppScreenshot />
          </div>
        </div>
      </div>
    </section>
  );
}
