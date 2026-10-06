"use client";

import { useState } from "react";
import { FileText, Shield, Scale } from "lucide-react";
import { TermsModal } from "@/components/legal/TermsModal";
import { COPYRIGHT_UPLOAD_NOTICE, LEGAL_COMPANY } from "@/lib/legal/constants";
import {
  isCopyrightUploadAcknowledged,
  setCopyrightUploadAcknowledged,
} from "@/lib/legal/acceptance-client";

export function CopyrightUploadNotice({
  onAcknowledged,
}: {
  onAcknowledged: () => void;
}) {
  const [hideAgain, setHideAgain] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);

  if (isCopyrightUploadAcknowledged()) return null;

  function handleContinue() {
    if (hideAgain) setCopyrightUploadAcknowledged();
    onAcknowledged();
  }

  return (
    <>
      <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
        <div className="mb-3 flex items-center gap-2 text-amber-200">
          <Scale className="h-5 w-5" />
          <h2 className="font-semibold">Copyright responsibility</h2>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-zinc-300">{COPYRIGHT_UPLOAD_NOTICE}</p>
        <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={hideAgain}
            onChange={(e) => setHideAgain(e.target.checked)}
            className="rounded border-white/20"
          />
          Do not show again on this device
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpenTerms(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
          >
            <FileText className="h-3.5 w-3.5" />
            Terms of Use
          </button>
          <button
            type="button"
            onClick={() => setOpenPrivacy(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
          >
            <Shield className="h-3.5 w-3.5" />
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="ml-auto rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
          >
            I understand — continue
          </button>
        </div>
        <p className="mt-3 text-[11px] text-zinc-600">{LEGAL_COMPANY}</p>
      </div>
      <TermsModal open={openTerms} onClose={() => setOpenTerms(false)} initialTab="terms" />
      <TermsModal open={openPrivacy} onClose={() => setOpenPrivacy(false)} initialTab="privacy" />
    </>
  );
}
