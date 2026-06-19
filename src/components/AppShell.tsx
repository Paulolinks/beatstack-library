"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Search, Upload, Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioPlayerProvider } from "@/context/AudioPlayerContext";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { Sidebar } from "@/components/Sidebar";

const NAV = [
  { href: "/", label: "Packs", icon: Library },
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/admin/import", label: "Importar", icon: Upload },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AudioPlayerProvider>
      <div className="flex min-h-screen bg-[#0a0a0c] text-zinc-100">
        <Sidebar />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0c]/95 backdrop-blur">
            <div className="flex h-14 items-center justify-between px-4 lg:px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight lg:hidden">
                <Disc3 className="h-5 w-5 text-sky-400" />
                <span>BeatStack Library</span>
              </Link>
              <nav className="ml-auto flex items-center gap-1">
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                      pathname === href || (href !== "/" && pathname.startsWith(href))
                        ? "bg-white/10 text-white"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 pb-28 lg:px-6">{children}</main>
          <NowPlayingBar />
        </div>
      </div>
    </AudioPlayerProvider>
  );
}
