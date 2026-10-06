"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { HardDrive, LayoutDashboard, LogOut, Megaphone, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAppTitleClient } from "@/lib/app-mode-client";

interface AuthUser {
  email: string;
  name: string | null;
  role: string;
}

const NAV = [
  { href: "/admin/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/manager-licenses", label: "Licenças", icon: HardDrive },
  { href: "/admin/campaigns", label: "Campanhas", icon: Megaphone },
];

export function LicenseAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as { user?: AuthUser | null };
      setUser(data.user ?? null);
      if (!data.user && pathname !== "/login") {
        router.replace("/login");
      }
    } catch {
      setUser(null);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (pathname === "/login") return;
    void checkSession();
  }, [pathname, checkSession]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#08080a] text-zinc-100">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-white/10 bg-[#060608]">
        <div className="border-b border-white/10 px-4 py-5">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-400" />
            <div>
              <p className="text-sm font-semibold leading-tight">{getAppTitleClient()}</p>
              <p className="text-[10px] text-zinc-600">Somente licenças Manager</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-0.5">
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    pathname === href || pathname.startsWith(`${href}/`)
                      ? "bg-violet-600/20 text-violet-200"
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

        <div className="border-t border-white/10 p-3">
          {user && (
            <p className="mb-2 truncate px-1 text-xs text-zinc-600">{user.email}</p>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
