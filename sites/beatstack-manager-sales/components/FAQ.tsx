"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { SectionHeading } from "@/components/SectionHeading";

const FAQ_ITEMS = [
  {
    q: "Does it work offline?",
    a: "Your samples stay on your PC and you can browse and preview them locally. You need an internet connection to log in and validate your license.",
  },
  {
    q: "Is it Windows only?",
    a: "Yes, for now BeatStack Manager is available for Windows. Mac support may come in the future.",
  },
  {
    q: "Is this a subscription?",
    a: "No. BeatStack Manager is a one-time payment. You pay once and keep access to your license — no monthly fee to access your own library.",
  },
  {
    q: "How many computers can I use?",
    a: "Your license allows one active session at a time. If you log in on another PC, the previous session is signed out — this protects your license.",
  },
  {
    q: "How do I get the app after purchase?",
    a: "After checkout you will receive an email with your login credentials and a download link for the BeatStack Manager installer. Log in and start organizing your library.",
  },
  {
    q: "What's the difference from BeatStack Library?",
    a: "BeatStack Manager is a desktop app for organizing your own local sample library. BeatStack Library is a separate cloud product. This page is for BeatStack Manager.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="border-t border-white/5 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Common Questions" />
        <div className="mt-10 space-y-3">
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <div
              key={q}
              className="overflow-hidden rounded-xl border border-white/10 bg-[#141418]"
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium text-zinc-100">{q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-zinc-500 transition ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <div className="border-t border-white/5 px-5 pb-4 pt-2 text-sm leading-relaxed text-zinc-400">
                  {a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
