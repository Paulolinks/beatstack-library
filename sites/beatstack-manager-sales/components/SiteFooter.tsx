import { Disc3 } from "lucide-react";
import Link from "next/link";
import { LICENSE_LOGIN_URL, SUPPORT_EMAIL } from "@/lib/config";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-[#0a0a0c] py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15">
              <Disc3 className="h-4 w-4 text-sky-400" />
            </div>
            <span className="font-[family-name:var(--font-syne)] font-bold text-zinc-300">
              BeatStack Manager
            </span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
            <Link href="#features" className="transition hover:text-zinc-300">
              Features
            </Link>
            <Link href="#pricing" className="transition hover:text-zinc-300">
              Pricing
            </Link>
            <Link href="#faq" className="transition hover:text-zinc-300">
              FAQ
            </Link>
            <a
              href={LICENSE_LOGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-zinc-300"
            >
              Login
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="transition hover:text-zinc-300"
            >
              Support
            </a>
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-zinc-600">
          © {year} BeatStack Manager. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
