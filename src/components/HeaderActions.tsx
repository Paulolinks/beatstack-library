"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Coffee } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { BUY_ME_COFFEE_URL } from "@/lib/i18n/messages";
import { useCampaigns } from "@/lib/campaigns/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { isManagerModeClient } from "@/lib/app-mode-client";
import { cn } from "@/lib/utils";

export function HeaderActions() {
  const { t } = useI18n();
  const { inbox, unreadCount, openCampaign } = useCampaigns();
  const isManager = isManagerModeClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onPointerDown);
      return () => document.removeEventListener("mousedown", onPointerDown);
    }
  }, [open]);

  return (
    <div className="ml-2 flex items-center gap-1 border-l border-white/10 pl-2">
      {isManager && (
        <>
          <a
            href={BUY_ME_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={t("buyMeCoffee")}
            className="hidden items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-amber-400/90 transition-colors hover:bg-amber-500/10 hover:text-amber-300 sm:flex"
          >
            <Coffee className="h-3.5 w-3.5" />
            <span>{t("buyMeCoffee")}</span>
          </a>
          <div className="relative" ref={panelRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              title={t("notifications")}
              className="relative flex items-center rounded-lg px-2 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-[#121216] shadow-2xl">
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-medium text-zinc-100">{t("campaignInbox")}</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {inbox.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-zinc-500">
                      {t("noNotifications")}
                    </p>
                  ) : (
                    inbox.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          openCampaign(item.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full flex-col gap-0.5 border-b border-white/[0.06] px-4 py-3 text-left transition-colors hover:bg-white/5",
                          item.unread && "bg-sky-500/[0.06]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "text-sm",
                              item.unread ? "font-semibold text-white" : "text-zinc-300",
                            )}
                          >
                            {item.title}
                          </span>
                          {item.unread && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                          )}
                        </div>
                        <span className="line-clamp-2 text-xs text-zinc-500">{item.body}</span>
                        <span className="text-[10px] text-zinc-600">
                          {item.responded
                            ? t("campaignResponded")
                            : item.unread
                              ? t("campaignUnread")
                              : t("campaignRead")}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
        </>
      )}
    </div>
  );
}
