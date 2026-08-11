"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Library, LogOut, Search, Upload, Disc3, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioPlayerProvider } from "@/context/AudioPlayerContext";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { Sidebar } from "@/components/Sidebar";
import { CampaignModal } from "@/components/CampaignModal";
import { HeaderActions } from "@/components/HeaderActions";
import { getAppTitleClient, isManagerModeClient } from "@/lib/app-mode-client";
import { I18nProvider } from "@/lib/i18n/context";
import { CampaignProvider } from "@/lib/campaigns/context";
import { useI18n } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";

interface AuthUser {
  email: string;
  name: string | null;
  role: string;
}

type MeResponse = {
  user: AuthUser | null;
  reason?: "SESSION_REPLACED" | "INVALID_TOKEN" | null;
  authDisabled?: boolean;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authDisabled, setAuthDisabled] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as MeResponse;
      setAuthDisabled(Boolean(data.authDisabled));

      if (data.user) {
        setUser(data.user);
        return;
      }

      setUser(null);

      // Offline Manager (AUTH_DISABLED): não redireciona para login.
      if (data.authDisabled) return;

      if (data.reason === "SESSION_REPLACED" || data.reason === "INVALID_TOKEN") {
        await fetch("/api/auth/logout", { method: "POST" });
        const params = new URLSearchParams();
        if (data.reason === "SESSION_REPLACED") {
          params.set("reason", "other_device");
        }
        router.replace(`/login${params.toString() ? `?${params}` : ""}`);
      }
    } catch {
      setUser(null);
    }
  }, [router]);

  useEffect(() => {
    if (pathname === "/login" || pathname.startsWith("/legal/")) return;
    void checkSession();
  }, [pathname, checkSession]);

  useEffect(() => {
    if (pathname === "/login" || pathname.startsWith("/legal/")) return;

    const interval = window.setInterval(() => {
      void checkSession();
    }, 45_000);

    return () => window.clearInterval(interval);
  }, [pathname, checkSession]);

  if (pathname === "/login" || pathname.startsWith("/legal/")) {
    return <I18nProvider>{children}</I18nProvider>;
  }

  const isManager = isManagerModeClient();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <I18nProvider>
      <CampaignProvider>
        <AppShellInner
          user={user}
          pathname={pathname}
          isManager={isManager}
          authDisabled={authDisabled}
          logout={logout}
        >
          {children}
        </AppShellInner>
      </CampaignProvider>
    </I18nProvider>
  );
}

function AppShellInner({
  children,
  user,
  pathname,
  isManager,
  authDisabled,
  logout,
}: {
  children: React.ReactNode;
  user: AuthUser | null;
  pathname: string;
  isManager: boolean;
  authDisabled: boolean;
  logout: () => Promise<void>;
}) {
  const { t } = useI18n();
  const hideAuthUi = authDisabled || (isManager && authDisabled);

  const nav: Array<{ href: string; labelKey: MessageKey; icon: typeof Library }> = [
    { href: "/", labelKey: "packs", icon: Library },
    { href: "/search", labelKey: "search", icon: Search },
    ...(user?.role === "admin" || isManager
      ? [
          { href: "/admin/import", labelKey: "import" as MessageKey, icon: Upload },
          ...(user?.role === "admin" && !isManager
            ? [{ href: "/admin/users", labelKey: "users" as MessageKey, icon: Users }]
            : []),
        ]
      : []),
  ];

  return (
    <AudioPlayerProvider>
      <div className="flex min-h-screen bg-[#0a0a0c] text-zinc-100">
        <Sidebar
          isAdmin={user?.role === "admin"}
          isManagerUser={isManager && !!user}
          hideLogout={hideAuthUi}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0c]/95 backdrop-blur">
            <div className="flex h-14 items-center justify-between px-4 lg:px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight lg:hidden">
                <Disc3 className="h-5 w-5 text-sky-400" />
                <span>{getAppTitleClient()}</span>
              </Link>
              <nav className="ml-auto flex items-center gap-1">
                {nav.map(({ href, labelKey, icon: Icon }) => (
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
                    <span className="hidden sm:inline">{t(labelKey)}</span>
                  </Link>
                ))}
                <HeaderActions />
                {!hideAuthUi && (
                  <div className="ml-2 flex items-center gap-2 border-l border-white/10 pl-2">
                    {user && (
                      <span className="hidden max-w-[140px] truncate text-xs text-zinc-500 md:inline">
                        {user.email}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void logout()}
                      title={t("logout")}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden sm:inline">{t("logout")}</span>
                    </button>
                  </div>
                )}
              </nav>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 pb-28 lg:px-6">{children}</main>
          <NowPlayingBar />
        </div>
      </div>
      {isManager && <CampaignModal />}
    </AudioPlayerProvider>
  );
}
