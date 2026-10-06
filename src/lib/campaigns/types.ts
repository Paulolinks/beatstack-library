export type CampaignType = "notice" | "poll" | "text" | "mixed";

export type CampaignOption = {
  id: string;
  label: string;
};

export type CampaignPayload = {
  id: string;
  title: string;
  body: string;
  type: CampaignType;
  options: CampaignOption[];
  allowText: boolean;
  autoSubmitOnOption: boolean;
};

export type CampaignInboxItem = CampaignPayload & {
  unread: boolean;
  responded: boolean;
  createdAt: string;
};

export type CampaignStats = {
  id: string;
  title: string;
  type: string;
  active: boolean;
  createdAt: string;
  opened: number;
  responded: number;
  options: Array<{ id: string; label: string; count: number }>;
};

export function parseCampaignOptions(raw: string): CampaignOption[] {
  try {
    const parsed = JSON.parse(raw) as CampaignOption[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((o) => o && typeof o.id === "string" && typeof o.label === "string")
      .slice(0, 4);
  } catch {
    return [];
  }
}

export function serializeCampaignOptions(options: CampaignOption[]): string {
  return JSON.stringify(options.slice(0, 4));
}
