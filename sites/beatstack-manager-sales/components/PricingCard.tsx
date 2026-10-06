import { Gift, Users } from "lucide-react";
import { CheckoutButton, checkoutLabel } from "@/components/CheckoutButton";
import { SectionHeading } from "@/components/SectionHeading";
import { LAUNCH_PRICE, REGULAR_PRICE } from "@/lib/config";

const BONUSES = [
  {
    icon: Users,
    title: "Private Producer Group",
    description:
      "Connect with other producers, discover new packs, share workflow ideas, receive updates, and access curated sound resources.",
  },
  {
    icon: Gift,
    title: "Curated Sample Pack Resources",
    description:
      "Access curated sample pack resources to help you start building your BeatStack library faster from day one.",
  },
];

export function PricingCard() {
  return (
    <section id="pricing" className="border-t border-white/5 bg-[#0a0a0c]/50 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Special launch offer"
          title="Get BeatStack Manager Today"
        />
        <div className="relative mx-auto mt-14 max-w-lg overflow-hidden rounded-3xl border border-sky-500/30 bg-[#141418] p-8 shadow-2xl shadow-sky-500/10">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative text-center">
            <p className="text-sm text-zinc-500">Regular value</p>
            <p className="mt-1 text-3xl font-medium text-zinc-600 line-through">
              ${REGULAR_PRICE}
            </p>
            <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-sky-400">
              Launch price
            </p>
            <p className="font-[family-name:var(--font-syne)] text-6xl font-extrabold text-zinc-50">
              ${LAUNCH_PRICE}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              One-time payment · No monthly fee · No subscription
            </p>
            <div className="mt-8">
              <CheckoutButton size="large" className="w-full">
                {checkoutLabel()}
              </CheckoutButton>
            </div>
          </div>
          <div className="relative mt-10 space-y-4 border-t border-white/10 pt-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Included bonuses
            </p>
            {BONUSES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
                  <Icon className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-200">{title}</p>
                  <p className="mt-1 text-sm text-zinc-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
