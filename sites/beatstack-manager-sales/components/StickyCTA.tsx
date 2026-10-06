"use client";

import { CheckoutButton, checkoutLabel } from "@/components/CheckoutButton";

export function StickyCTA() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#050508]/95 p-3 backdrop-blur-xl sm:hidden">
      <CheckoutButton className="w-full" size="default">
        {checkoutLabel(true)}
      </CheckoutButton>
    </div>
  );
}
