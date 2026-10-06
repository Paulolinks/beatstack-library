"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, FileText, Shield } from "lucide-react";
import { TermsModal } from "@/components/legal/TermsModal";
import {
  LEGAL_COMPANY,
  LEGAL_COPYRIGHT_EMAIL,
  LEGAL_PRIVACY_EMAIL,
  LEGAL_SUPPORT_EMAIL,
} from "@/lib/legal/constants";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal/versions";
import { getLocalLegalStatus } from "@/lib/legal/acceptance-client";
import { getAppTitleClient } from "@/lib/app-mode-client";

export default function SettingsLegalPage() {
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
  const [termsVersion, setTermsVersion] = useState<string | null>(null);
  const [privacyVersion, setPrivacyVersion] = useState<string | null>(null);
  const [openTerms, setOpenTerms] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      const local = await getLocalLegalStatus();
      if (local.record) {
        setAcceptedAt(local.record.acceptedAt);
        setTermsVersion(local.record.termsVersion);
        setPrivacyVersion(local.record.privacyVersion);
      }
      try {
        const res = await fetch("/api/legal/status", { credentials: "same-origin" });
        if (res.ok) {
          const data = (await res.json()) as {
            acceptedAt?: string | null;
            termsVersion?: string | null;
            privacyVersion?: string | null;
          };
          if (data.acceptedAt) setAcceptedAt(data.acceptedAt);
          if (data.termsVersion) setTermsVersion(data.termsVersion);
          if (data.privacyVersion) setPrivacyVersion(data.privacyVersion);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function copyContact() {
    await navigator.clipboard.writeText(LEGAL_SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h1 className="mb-2 text-2xl font-semibold">Legal</h1>
      <p className="mb-8 text-sm text-zinc-500">
        {getAppTitleClient()} · {LEGAL_COMPANY}
      </p>

      <div className="mb-6 space-y-3 rounded-xl border border-white/10 bg-[#141418] p-5 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Terms version</span>
          <span className="font-mono text-zinc-300">{termsVersion ?? TERMS_VERSION}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Privacy version</span>
          <span className="font-mono text-zinc-300">{privacyVersion ?? PRIVACY_VERSION}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Accepted at</span>
          <span className="text-zinc-300">
            {acceptedAt ? new Date(acceptedAt).toLocaleString() : "Not recorded"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Current required</span>
          <span className="font-mono text-zinc-300">
            {TERMS_VERSION} / {PRIVACY_VERSION}
          </span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpenTerms(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
        >
          <FileText className="h-4 w-4" />
          Terms of Use
        </button>
        <button
          type="button"
          onClick={() => setOpenPrivacy(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
        >
          <Shield className="h-4 w-4" />
          Privacy Policy
        </button>
        <Link
          href="/legal/accept?next=/"
          className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-300 hover:bg-sky-500/20"
        >
          Review acceptance
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#141418] p-5 text-sm text-zinc-400">
        <p className="mb-2 font-medium text-zinc-200">Contact</p>
        <p>Support: {LEGAL_SUPPORT_EMAIL}</p>
        <p>Privacy: {LEGAL_PRIVACY_EMAIL}</p>
        <p>Copyright / DMCA: {LEGAL_COPYRIGHT_EMAIL}</p>
        <button
          type="button"
          onClick={() => void copyContact()}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied!" : "Copy support email"}
        </button>
      </div>

      <TermsModal open={openTerms} onClose={() => setOpenTerms(false)} initialTab="terms" />
      <TermsModal open={openPrivacy} onClose={() => setOpenPrivacy(false)} initialTab="privacy" />
    </div>
  );
}
