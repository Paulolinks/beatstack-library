import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CHECKOUT_URL, LAUNCH_PRICE } from "@/lib/config";
import { cn } from "@/lib/utils";

type CheckoutButtonProps = {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "large" | "hero";
};

const sizeClasses = {
  default: "px-6 py-3 text-base",
  large: "px-8 py-4 text-lg",
  hero: "w-full max-w-md px-10 py-5 text-lg sm:text-xl",
};

const baseClasses =
  "inline-flex items-center justify-center gap-3 rounded-2xl font-bold text-white transition duration-200 hover:scale-[1.02] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-900/40 hover:shadow-violet-700/50";

export function CheckoutButton({
  children,
  className,
  size = "default",
}: CheckoutButtonProps) {
  const isPlaceholder = CHECKOUT_URL === "#pricing";
  const href = isPlaceholder ? "#pricing" : CHECKOUT_URL;

  return (
    <a
      href={href}
      target={isPlaceholder ? undefined : "_blank"}
      rel={isPlaceholder ? undefined : "noopener noreferrer"}
      className={cn(baseClasses, sizeClasses[size], className)}
    >
      {children}
      <ArrowRight className={size === "hero" ? "h-6 w-6" : "h-5 w-5"} />
    </a>
  );
}

export function CheckoutLink({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const href = CHECKOUT_URL === "#pricing" ? "#pricing" : CHECKOUT_URL;
  const external = CHECKOUT_URL !== "#pricing";

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={className}
    >
      {children}
    </Link>
  );
}

export function checkoutLabel(short = false) {
  return short
    ? `Get Access — $${LAUNCH_PRICE}`
    : `Get BeatStack Manager — $${LAUNCH_PRICE}`;
}
