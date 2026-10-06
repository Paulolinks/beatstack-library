"use client";

import { useEffect, useState } from "react";
import { X, FileText, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { LEGAL_COMPANY } from "@/lib/legal/constants";

type Tab = "terms" | "privacy";

export function TermsModal({
  open,
  onClose,
  initialTab = "terms",
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [terms, setTerms] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setLoading(true);
    void fetch("/api/legal/documents")
      .then((r) => r.json())
      .then((data: { terms?: string; privacy?: string }) => {
        setTerms(data.terms ?? "");
        setPrivacy(data.privacy ?? "");
      })
      .finally(() => setLoading(false));
  }, [open, initialTab]);

  if (!open) return null;

  const content = tab === "terms" ? terms : privacy;

  function handlePrint() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<pre style="white-space:pre-wrap;font-family:system-ui;padding:24px">${content.replace(/</g, "&lt;")}</pre>`);
    w.document.close();
    w.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#141418] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{LEGAL_COMPANY}</h2>
            <p className="text-xs text-zinc-500">Beat Stack Library — Legal</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-white/10 px-5 pt-3">
          <button
            type="button"
            onClick={() => setTab("terms")}
            className={cn(
              "flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm transition",
              tab === "terms"
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <FileText className="h-4 w-4" />
            Terms of Use
          </button>
          <button
            type="button"
            onClick={() => setTab("privacy")}
            className={cn(
              "flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm transition",
              tab === "privacy"
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Shield className="h-4 w-4" />
            Privacy Policy
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300">
              {content}
            </pre>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
          >
            Print / Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
