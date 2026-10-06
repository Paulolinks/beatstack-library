"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useCampaigns } from "@/lib/campaigns/context";

export function CampaignModal() {
  const { t } = useI18n();
  const { active, closeActive, refresh } = useCampaigns();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const prevActiveId = useRef<string | null>(null);

  useEffect(() => {
    if (active?.id !== prevActiveId.current) {
      prevActiveId.current = active?.id ?? null;
      setText("");
      setSelected(null);
      setDone(false);
    }
  }, [active?.id]);

  if (!active) return null;

  const campaign = active;
  const showPoll = campaign.type === "poll" || campaign.type === "mixed";
  const showText = campaign.type === "text" || campaign.type === "mixed" || campaign.allowText;
  const isNotice = campaign.type === "notice";

  async function submit(payload?: { selectedOption?: string | null; textResponse?: string | null }) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          payload ?? {
            selectedOption: selected,
            textResponse: text.trim() || null,
          },
        ),
      });
      if (res.ok) {
        setDone(true);
        window.setTimeout(async () => {
          setText("");
          setSelected(null);
          setDone(false);
          closeActive();
          await refresh();
        }, 1200);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#121216] p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={closeActive}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="pr-8 text-lg font-semibold text-white">{campaign.title}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
          {campaign.body}
        </p>

        {done ? (
          <p className="mt-6 text-sm text-emerald-400">{t("campaignThanks")}</p>
        ) : (
          <>
            {showPoll && campaign.options.length > 0 && (
              <div className="mt-5 space-y-2">
                {campaign.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setSelected(opt.id);
                      if (campaign.autoSubmitOnOption && !showText) {
                        void submit({ selectedOption: opt.id, textResponse: null });
                      }
                    }}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                      selected === opt.id
                        ? "border-sky-500/50 bg-sky-500/10 text-white"
                        : "border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {showText && (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-zinc-500">{t("campaignYourAnswer")}</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder={t("campaignPlaceholder")}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/50"
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              {isNotice ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submit({ selectedOption: null, textResponse: null })}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {t("campaignOk")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || (showPoll && !selected && !showText)}
                  onClick={() => void submit()}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {submitting ? "..." : t("campaignSend")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
