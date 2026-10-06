"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CampaignInboxItem, CampaignPayload } from "@/lib/campaigns/types";
import { isManagerModeClient } from "@/lib/app-mode-client";

type CampaignContextValue = {
  inbox: CampaignInboxItem[];
  unreadCount: number;
  active: CampaignPayload | null;
  refresh: () => Promise<void>;
  openCampaign: (id: string) => void;
  closeActive: () => void;
};

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [inbox, setInbox] = useState<CampaignInboxItem[]>([]);
  const [active, setActive] = useState<CampaignPayload | null>(null);

  const refresh = useCallback(async () => {
    if (!isManagerModeClient()) {
      setInbox([]);
      return;
    }
    try {
      const res = await fetch("/api/campaigns/inbox");
      if (!res.ok) return;
      const data = (await res.json()) as { campaigns?: CampaignInboxItem[] };
      setInbox(data.campaigns ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 120_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const openCampaign = useCallback(
    (id: string) => {
      const item = inbox.find((c) => c.id === id);
      if (!item) return;

      const { unread: _unread, responded: _responded, createdAt: _createdAt, ...payload } = item;
      setActive(payload);

      if (item.unread) {
        void fetch(`/api/campaigns/${id}/view`, { method: "POST" }).then(() => refresh());
      }
    },
    [inbox, refresh],
  );

  const closeActive = useCallback(() => {
    setActive(null);
  }, []);

  const unreadCount = useMemo(() => inbox.filter((c) => c.unread).length, [inbox]);

  const value = useMemo(
    () => ({
      inbox,
      unreadCount,
      active,
      refresh,
      openCampaign,
      closeActive,
    }),
    [inbox, unreadCount, active, refresh, openCampaign, closeActive],
  );

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
}

export function useCampaigns() {
  const ctx = useContext(CampaignContext);
  if (!ctx) {
    return {
      inbox: [],
      unreadCount: 0,
      active: null,
      refresh: async () => {},
      openCampaign: () => {},
      closeActive: () => {},
    };
  }
  return ctx;
}
