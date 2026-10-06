import { CheckoutButton, checkoutLabel } from "@/components/CheckoutButton";
import { LAUNCH_PRICE } from "@/lib/config";

export function FinalCTA() {
  return (
    <section className="border-t border-white/5 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-[family-name:var(--font-syne)] text-3xl font-bold text-zinc-50 sm:text-4xl">
          Build Your Personal Sample Library
        </h2>
        <p className="mt-4 text-lg text-zinc-400">
          Stop searching through folders. Stop losing ideas. Start producing with more
          speed, clarity, and control.
        </p>
        <p className="mt-6 font-[family-name:var(--font-syne)] text-xl font-bold text-zinc-200">
          BeatStack Manager — Your personal Splice for your own samples.
        </p>
        <div className="mt-10">
          <CheckoutButton size="large">
            Get Access Now for ${LAUNCH_PRICE}
          </CheckoutButton>
        </div>
        <p className="mt-4 text-sm text-zinc-600">
          Or keep producing the old way — searching, forgetting, and leaving projects unfinished.
        </p>
      </div>
    </section>
  );
}
