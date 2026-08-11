"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderSync, Loader2 } from "lucide-react";
import { isManagerModeClient } from "@/lib/app-mode-client";

type SyncResult = {
  ok?: boolean;
  message?: string;
  error?: string;
  scanned?: number;
  added?: Array<{ name: string; slug: string; sampleCount: number }>;
  removed?: Array<{ name: string; slug: string }>;
  skipped?: Array<{ folder: string; reason: string }>;
  errors?: Array<{ folder: string; error: string }>;
  packsDir?: string;
};

export function SyncPacksFolderButton({
  variant = "panel",
}: {
  variant?: "panel" | "inline";
}) {
  const isManager = isManagerModeClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  if (!isManager) return null;

  async function runSync() {
    const ok = window.confirm(
      "Atualizar packs a partir da pasta de armazenamento?\n\n" +
        "• Adiciona pastas novas que ainda não estão no app\n" +
        "• Remove do app packs cuja pasta sumiu do disco\n\n" +
        "Isso não apaga arquivos do HD — só sincroniza o índice.",
    );
    if (!ok) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/manager/sync-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeMissing: true }),
      });
      const data = (await res.json()) as SyncResult;
      if (!res.ok) {
        setResult({ error: data.error || "Falha ao atualizar packs" });
        return;
      }
      setResult(data);
      router.refresh();
    } catch (err) {
      setResult({
        error: err instanceof Error ? err.message : "Erro ao atualizar packs",
      });
    } finally {
      setLoading(false);
    }
  }

  if (variant === "inline") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => void runSync()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderSync className="h-4 w-4" />}
          Atualizar packs
        </button>
        {result?.message && <p className="text-xs text-emerald-300">{result.message}</p>}
        {result?.error && <p className="text-xs text-red-300">{result.error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <FolderSync className="h-4 w-4 text-sky-400" />
        Atualizar packs da pasta
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        Depois de copiar ou extrair packs em <code className="text-zinc-400">packs/</code> (pendrive,
        outro PC, WinRAR…), clique aqui. O Manager lê as pastas, adiciona as novas e remove do
        índice o que não existe mais no disco.
      </p>
      <button
        type="button"
        onClick={() => void runSync()}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Lendo pastas… (pode demorar)
          </>
        ) : (
          <>
            <FolderSync className="h-4 w-4" />
            Atualizar packs
          </>
        )}
      </button>

      {result?.message && (
        <div className="mt-3 space-y-1 text-xs text-emerald-300">
          <p>{result.message}</p>
          {result.added && result.added.length > 0 && (
            <p className="text-zinc-400">
              Novos: {result.added.map((a) => `${a.name} (${a.sampleCount})`).join(", ")}
            </p>
          )}
          {result.removed && result.removed.length > 0 && (
            <p className="text-zinc-400">
              Removidos do índice: {result.removed.map((r) => r.name).join(", ")}
            </p>
          )}
          {result.errors && result.errors.length > 0 && (
            <p className="text-amber-300">
              Erros: {result.errors.map((e) => `${e.folder}: ${e.error}`).join(" · ")}
            </p>
          )}
        </div>
      )}
      {result?.error && <p className="mt-3 text-xs text-red-300">{result.error}</p>}
    </div>
  );
}
