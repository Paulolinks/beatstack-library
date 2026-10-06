"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Library,
  Search,
  Upload,
  Star,
  Heart,
  Download,
  Disc3,
  Settings2,
  LogOut,
  Users,
  Cloud,
  CloudUpload,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FavoriteFolderCreateForm, FavoriteFoldersPanel } from "@/components/FavoriteFoldersPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getAppTitleClient, isManagerModeClient, usesFavoriteFoldersClient } from "@/lib/app-mode-client";
import { useI18n } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";

const NAV_KEYS = [
  { href: "/", labelKey: "packs" as MessageKey, icon: Library },
  { href: "/search", labelKey: "search" as MessageKey, icon: Search },
];

const ADMIN_NAV_KEYS = [{ href: "/admin/import", labelKey: "import" as MessageKey, icon: Upload }];

const LIBRARY_COLLECTIONS: Array<{
  href: string;
  labelKey?: MessageKey;
  label?: string;
  icon: typeof Star;
}> = [
  { href: "/collections/ranked", labelKey: "ranked", icon: Star },
  { href: "/collections/likes", label: "Likes", icon: Heart },
  { href: "/collections/copied", labelKey: "copied", icon: Download },
];

const MANAGER_COLLECTIONS: Array<{
  href: string;
  labelKey: MessageKey;
  icon: typeof Star;
}> = [
  { href: "/collections/ranked", labelKey: "ranked", icon: Star },
  { href: "/collections/favoritos", labelKey: "favorites", icon: Heart },
  { href: "/collections/copied", labelKey: "copied", icon: Download },
];

const ADMIN: Array<{ href: string; labelKey: MessageKey; icon: typeof Settings2 }> = [
  { href: "/admin/packs", labelKey: "managePacks", icon: Settings2 },
];

const ADMIN_MANAGER: Array<{ href: string; labelKey: MessageKey; icon: typeof CloudUpload }> = [
  { href: "/cloud", labelKey: "cloudVps" as MessageKey, icon: Cloud },
  { href: "/admin/sync-vps", labelKey: "syncVps" as MessageKey, icon: CloudUpload },
];

const ADMIN_LIBRARY: Array<{ href: string; label?: string; labelKey?: MessageKey; icon: typeof Users }> = [
  { href: "/admin/users", label: "Usuários Library", icon: Users },
];

export function Sidebar({
  isAdmin = false,
  isManagerUser = false,
  hideLogout = false,
}: {
  isAdmin?: boolean;
  isManagerUser?: boolean;
  hideLogout?: boolean;
}) {
  const pathname = usePathname();
  const isManager = isManagerModeClient();
  const showFavoriteFolders = usesFavoriteFoldersClient();
  const { t, setLocale } = useI18n();
  const showImport = isAdmin || isManagerUser || isManager;
  const nav = showImport ? [...NAV_KEYS, ...ADMIN_NAV_KEYS] : NAV_KEYS;
  const collections = showFavoriteFolders ? MANAGER_COLLECTIONS : LIBRARY_COLLECTIONS;
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!isManager) return;
    void fetch("/api/manager/locale")
      .then((r) => r.json())
      .then((data: { locale?: string }) => {
        if (data.locale === "en" || data.locale === "pt" || data.locale === "es") {
          setLocale(data.locale);
        }
      })
      .catch(() => {});
  }, [isManager, setLocale]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col border-r border-white/10 bg-[#08080a]">
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Disc3 className="h-5 w-5 text-sky-400" />
          <span className="text-sm leading-tight">{getAppTitleClient()}</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          {t("menu")}
        </p>
        <ul className="mb-6 space-y-0.5">
          {nav.map(({ href, labelKey, icon: Icon }) => (
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
                {t(labelKey)}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          {t("collections")}
        </p>
        <ul className="space-y-0.5">
          {(collections as Array<{
            href: string;
            labelKey?: MessageKey;
            label?: string;
            icon: typeof Star;
          }>).map(({ href, labelKey, label, icon: Icon }) => (
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
                {labelKey ? t(labelKey) : (label ?? href)}
              </Link>
            </li>
          ))}
        </ul>

        {showFavoriteFolders && <FavoriteFoldersPanel />}

        {isAdmin && !isManager && (
          <>
            <p className="mb-2 mt-6 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Admin
            </p>
            <ul className="space-y-0.5">
              {([...ADMIN, ...ADMIN_LIBRARY] as Array<{
                href: string;
                labelKey?: MessageKey;
                label?: string;
                icon: typeof Settings2;
              }>).map(({ href, labelKey, label, icon: Icon }) => (
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
                    {labelKey ? t(labelKey) : label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {isManager && (
          <>
            <p className="mb-2 mt-6 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              {t("packs")}
            </p>
            <ul className="space-y-0.5">
              {([...ADMIN, ...ADMIN_MANAGER] as Array<{
                href: string;
                labelKey: MessageKey;
                icon: typeof Settings2;
              }>).map(({ href, labelKey, icon: Icon }) => (
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
                    {t(labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      {showFavoriteFolders && <FavoriteFolderCreateForm />}

      <div className="border-t border-white/10 p-2 space-y-0.5">
        {(isManager || showFavoriteFolders) && <LanguageSwitcher compact />}
        <Link
          href="/settings/legal"
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
        >
          <Scale className="h-4 w-4 shrink-0" />
          Legal
        </Link>
        {!hideLogout && (
          <button
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {loggingOut ? t("loggingOut") : t("logout")}
          </button>
        )}
      </div>
    </aside>
  );
}
