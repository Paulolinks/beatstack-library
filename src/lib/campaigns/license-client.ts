import { getLicenseCookieName, getLicenseServerUrl } from "@/lib/auth/license-server";
import { getSessionCookieName } from "@/lib/auth/session";
import type { CampaignInboxItem, CampaignPayload } from "@/lib/campaigns/types";

async function licenseFetch(
  licenseToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${getLicenseServerUrl()}${path}`;
  const headers = new Headers(init?.headers);
  headers.set("Cookie", `${getSessionCookieName()}=${licenseToken}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers, cache: "no-store" });
}

export async function fetchInboxCampaigns(licenseToken: string): Promise<CampaignInboxItem[]> {
  const res = await licenseFetch(licenseToken, "/api/campaigns/inbox");
  if (!res.ok) return [];
  const data = (await res.json()) as { campaigns?: CampaignInboxItem[] };
  return data.campaigns ?? [];
}

export async function fetchPendingCampaigns(licenseToken: string): Promise<CampaignPayload[]> {
  const res = await licenseFetch(licenseToken, "/api/campaigns/pending");
  if (!res.ok) return [];
  const data = (await res.json()) as { campaigns?: CampaignPayload[] };
  return data.campaigns ?? [];
}

export async function markCampaignViewed(
  licenseToken: string,
  campaignId: string,
): Promise<boolean> {
  const res = await licenseFetch(licenseToken, `/api/campaigns/${campaignId}/view`, {
    method: "POST",
  });
  return res.ok;
}

export async function respondToCampaign(
  licenseToken: string,
  campaignId: string,
  data: { selectedOption?: string | null; textResponse?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const res = await licenseFetch(licenseToken, `/api/campaigns/${campaignId}/respond`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return res.ok ? { ok: true } : { ok: false, error: json.error ?? "Falha ao enviar" };
}

export { getLicenseCookieName };
