"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Disc3, FileText, Loader2, Shield } from "lucide-react";
import { TermsModal } from "@/components/legal/TermsModal";
import { INSTALLER_NOTICE, LEGAL_COMPANY } from "@/lib/legal/constants";
import {
  getLocalLegalStatus,
  saveLocalLegalAcceptance,
  syncLegalAcceptanceToServer,
} from "@/lib/legal/acceptance-client";
import { getAppTitleClient } from "@/lib/app-mode-client";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal/versions";

function LegalAcceptForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/login";
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);

  useEffect(() => {
    void getLocalLegalStatus().then((status) => {
      if (status.accepted) {
        router.replace(next);
        return;
      }
      setLoading(false);
    });
  }, [next, router]);

  async function handleAccept() {
    if (!checked || submitting) return;
    setSubmitting(true);
    try {
      const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
      await saveLocalLegalAcceptance({
        appVersion,
        os: typeof navigator !== "undefined" ? navigator.platform : undefined,
        source: window.beatstack?.isDesktop ? "desktop" : "web",
      });

      await fetch("/api/legal/acceptance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          appVersion,
          os: typeof navigator !== "undefined" ? navigator.platform : undefined,
          source: window.beatstack?.isDesktop ? "desktop" : "web",
        }),
      }).catch(() => {});

      await syncLegalAcceptanceToServer(appVersion);
      router.replace(next);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDecline() {
    if (window.beatstack?.isDesktop) {
      window.close();
      return;
    }
    window.location.href = "about:blank";
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141418] p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15">
            <Disc3 className="h-8 w-8 text-sky-400" />
          </div>
          <h1 className="text-xl font-semibold">{getAppTitleClient()}</h1>
          <p className="mt-1 text-sm text-zinc-500">{LEGAL_COMPANY}</p>
        </div>

        <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
          {INSTALLER_NOTICE.split("\n\n").slice(0, 3).join("\n\n")}
        </p>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpenTerms(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10"
          >
            <FileText className="h-4 w-4" />
            Terms of Use
          </button>
          <button
            type="button"
            onClick={() => setOpenPrivacy(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10"
          >
            <Shield className="h-4 w-4" />
            Privacy Policy
          </button>
        </div>

        <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-[#0d0d0f] p-4 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 rounded border-white/20"
          />
          <span>I have read and agree to the Terms of Use and Privacy Policy.</span>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={!checked || submitting}
            onClick={() => void handleAccept()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue
          </button>
          <button
            type="button"
            onClick={handleDecline}
            className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-zinc-400 hover:bg-white/5"
          >
            Decline
          </button>
        </div>
      </div>

      <TermsModal open={openTerms} onClose={() => setOpenTerms(false)} initialTab="terms" />
      <TermsModal open={openPrivacy} onClose={() => setOpenPrivacy(false)} initialTab="privacy" />
    </div>
  );
}

export default function LegalAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] text-zinc-500">
          …
        </div>
      }
    >
      <LegalAcceptForm />
    </Suspense>
  );
}
