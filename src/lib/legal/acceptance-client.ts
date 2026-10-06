"use client";

import { TERMS_VERSION, PRIVACY_VERSION, needsLegalReaccept } from "@/lib/legal/versions";

const LOCAL_KEY = "beatstack_legal_acceptance";

export type LocalLegalAcceptance = {
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
  appVersion?: string;
  os?: string;
  source?: string;
};

function readLocal(): LocalLegalAcceptance | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalLegalAcceptance;
  } catch {
    return null;
  }
}

function writeLocal(data: LocalLegalAcceptance): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

export async function getLocalLegalStatus(): Promise<{
  accepted: boolean;
  needsReaccept: boolean;
  record: LocalLegalAcceptance | null;
}> {
  if (typeof window !== "undefined" && window.beatstack?.legal?.getStatus) {
    const desktop = await window.beatstack.legal.getStatus();
    if (desktop.record) {
      const needsReaccept = needsLegalReaccept(
        desktop.record.termsVersion,
        desktop.record.privacyVersion,
      );
      return { accepted: !needsReaccept, needsReaccept, record: desktop.record };
    }
  }

  const record = readLocal();
  if (!record) {
    return { accepted: false, needsReaccept: true, record: null };
  }
  const needsReaccept = needsLegalReaccept(record.termsVersion, record.privacyVersion);
  return { accepted: !needsReaccept, needsReaccept, record };
}

export async function saveLocalLegalAcceptance(input: {
  appVersion?: string;
  os?: string;
  source?: string;
}): Promise<LocalLegalAcceptance> {
  const record: LocalLegalAcceptance = {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    acceptedAt: new Date().toISOString(),
    appVersion: input.appVersion,
    os: input.os,
    source: input.source ?? "app",
  };

  if (window.beatstack?.legal?.accept) {
    await window.beatstack.legal.accept(record);
  }
  writeLocal(record);
  return record;
}

export async function syncLegalAcceptanceToServer(appVersion?: string): Promise<void> {
  try {
    await fetch("/api/legal/acceptance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        appVersion,
        source: "app-sync",
      }),
    });
  } catch {
    /* offline or not logged in */
  }
}

export async function hasCurrentLegalAcceptance(): Promise<boolean> {
  const local = await getLocalLegalStatus();
  if (local.accepted) return true;

  try {
    const res = await fetch("/api/legal/status", { credentials: "same-origin" });
    if (!res.ok) return false;
    const data = (await res.json()) as { accepted?: boolean };
    return Boolean(data.accepted);
  } catch {
    return false;
  }
}

const COPYRIGHT_KEY = "beatstack_copyright_upload_ack";

export function isCopyrightUploadAcknowledged(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(COPYRIGHT_KEY) === "1";
}

export function setCopyrightUploadAcknowledged(): void {
  localStorage.setItem(COPYRIGHT_KEY, "1");
}
