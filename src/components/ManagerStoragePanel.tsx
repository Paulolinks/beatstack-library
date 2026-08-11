"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderOpen, HardDrive, Loader2 } from "lucide-react";
import { isManagerModeClient } from "@/lib/app-mode-client";

export function ManagerStoragePanel() {
  const isManager = isManagerModeClient();
  const [storageRoot, setStorageRoot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isManager) return;
    setLoading(true);
    try {
      if (window.beatstack?.storage?.get) {
        const data = await window.beatstack.storage.get();
        if (data.ok && data.storageRoot) {
          setStorageRoot(data.storageRoot);
          return;
        }
      }
      const res = await fetch("/api/manager/storage");
      const data = (await res.json()) as { storageRoot?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Falha ao carregar pasta");
      setStorageRoot(data.storageRoot ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pasta");
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pickAndSave() {
    setError(null);
    setMessage(null);
    if (!window.beatstack?.selectDirectory) {
      setError("Seletor de pasta disponível só no app desktop BeatStack Manager");
      return;
    }

    const picked = await window.beatstack.selectDirectory({
      title: "Pasta principal dos packs / samples",
      defaultPath: storageRoot || undefined,
    });
    if (!picked.ok || !picked.path) return;

    setSaving(true);
    try {
      if (window.beatstack.storage?.set) {
        const result = await window.beatstack.storage.set(picked.path);
        if (!result.ok) throw new Error(result.error || "Falha ao salvar");
        setStorageRoot(result.storageRoot ?? picked.path);
      }
      const res = await fetch("/api/manager/storage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageRoot: picked.path }),
      });
      const data = (await res.json()) as { storageRoot?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Falha ao salvar");
      setStorageRoot(data.storageRoot ?? picked.path);
      setMessage(
        "Pasta salva. Novos packs serão gravados aqui. Packs já importados ficam na pasta antiga até você reimportar.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar pasta");
    } finally {
      setSaving(false);
    }
  }

  async function openFolder() {
    if (!storageRoot) return;
    await window.beatstack?.openPath?.(storageRoot);
  }

  if (!isManager) return null;

  return (
    <div className="mb-6 rounded-xl border border-white/10 bg-[#141418] p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <HardDrive className="h-4 w-4 text-sky-400" />
        Pasta de armazenamento dos packs
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        Extraia ZIPs grandes manualmente nesta pasta (ou em subpastas) e depois use “Pasta no disco”
        para indexar no Manager. Packs importados pelo app também vão para{" "}
        <code className="text-zinc-400">packs/</code> dentro deste local.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando...
        </div>
      ) : (
        <>
          <div className="mb-3 break-all rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 font-mono text-xs text-zinc-300">
            {storageRoot || "—"}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void pickAndSave()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
              Selecionar pasta
            </button>
            <button
              type="button"
              onClick={() => void openFolder()}
              disabled={!storageRoot}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/15 disabled:opacity-50"
            >
              Abrir no Explorer
            </button>
          </div>
        </>
      )}

      {message && <p className="mt-3 text-xs text-emerald-300">{message}</p>}
      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
    </div>
  );
}
