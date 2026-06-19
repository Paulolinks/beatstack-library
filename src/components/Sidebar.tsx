"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Library,
  Search,
  Upload,
  Star,
  Heart,
  Download,
  Disc3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Packs", icon: Library },
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/admin/import", label: "Importar", icon: Upload },
];

const COLLECTIONS = [
  { href: "/collections/ranked", label: "Ranqueados", icon: Star },
  { href: "/collections/likes", label: "Likes", icon: Heart },
  { href: "/collections/copied", label: "Copiados", icon: Download },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col border-r border-white/10 bg-[#08080a]">
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Disc3 className="h-5 w-5 text-sky-400" />
          <span className="text-sm">BeatStack</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Menu
        </p>
        <ul className="mb-6 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  isActive(href)
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Collections
        </p>
        <ul className="space-y-0.5">
          {COLLECTIONS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  isActive(href)
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
