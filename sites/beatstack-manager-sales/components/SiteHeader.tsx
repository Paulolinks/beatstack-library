import { Disc3 } from "lucide-react";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="#" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15">
            <Disc3 className="h-5 w-5 text-sky-400" />
          </div>
          <span className="font-[family-name:var(--font-syne)] text-lg font-bold tracking-tight text-zinc-100">
            BeatStack Manager
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-zinc-400 sm:flex">
          <Link href="#features" className="transition hover:text-zinc-100">
            Features
          </Link>
          <Link href="#pricing" className="transition hover:text-zinc-100">
            Pricing
          </Link>
          <Link href="#faq" className="transition hover:text-zinc-100">
            FAQ
          </Link>
        </nav>
        <Link
          href="#pricing"
          className="rounded-lg bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/25"
        >
          Get Access
        </Link>
      </div>
    </header>
  );
}
