"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { localeLabel, nextLocale } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  function toggle() {
    setLocale(nextLocale(locale));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={t("language")}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200",
        compact && "w-full",
      )}
    >
      <Globe className="h-4 w-4 shrink-0" />
      <span>{localeLabel(locale)}</span>
    </button>
  );
}
