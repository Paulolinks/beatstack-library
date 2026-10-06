"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isManagerModeClient } from "@/lib/app-mode-client";
import { useI18n } from "@/lib/i18n/context";

type PackDeleteButtonProps = {
  packId: string;
  packName: string;
  /** After delete, navigate here (omit to only refresh). */
  redirectTo?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
};

export function PackDeleteButton({
  packId,
  packName,
  redirectTo,
  disabled = false,
  className,
  size = "sm",
}: PackDeleteButtonProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [deleting, setDeleting] = useState(false);
  const isManager = isManagerModeClient();

  async function handleDelete() {
    const msg = (isManager ? t("deletePackConfirmLocal") : t("deletePackConfirmCloud")).replace(
      "{name}",
      packName,
    );
    if (!window.confirm(msg)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/packs/${packId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(data.error ?? t("deletePackError"));
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const sizeClass =
    size === "md"
      ? "gap-2 rounded-lg px-4 py-2 text-sm"
      : "gap-1.5 rounded-lg px-3 py-1.5 text-xs";

  return (
    <button
      type="button"
      disabled={disabled || deleting}
      onClick={() => void handleDelete()}
      className={cn(
        "inline-flex items-center border border-red-500/30 bg-red-500/10 font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-40",
        sizeClass,
        className,
      )}
    >
      {deleting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      {t("deletePack")}
    </button>
  );
}
