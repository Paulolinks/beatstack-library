"use client";

import { useCallback, useEffect, useState } from "react";
import { Cloud, HardDrive, Loader2 } from "lucide-react";

export type PackSyncMap = Record<string, boolean>;

export function usePackSyncStatus(enabled: boolean) {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [onVpsBySlug, setOnVpsBySlug] = useState<PackSyncMap>({});
  const [loading, setLoading] = useState(enabled);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [queueRunning, setQueueRunning] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/admin/sync-vps/status");
      const data = (await res.json()) as {
        enabled?: boolean;
        remoteError?: string | null;
        packs?: Array<{ slug: string; onVps: boolean }>;
        queue?: { running: boolean };
      };
      setSyncEnabled(Boolean(data.enabled));
      setRemoteError(data.remoteError ?? null);
      setQueueRunning(Boolean(data.queue?.running));
      if (data.packs) {
        const map: PackSyncMap = {};
        for (const p of data.packs) map[p.slug] = p.onVps;
        setOnVpsBySlug(map);
      }
    } catch {
      setSyncEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!queueRunning) return;
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, [queueRunning, refresh]);

  return { syncEnabled, onVpsBySlug, loading, remoteError, queueRunning, refresh };
}

export function PackSyncBadge({ onVps }: { onVps: boolean }) {
  if (onVps) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
        title="Disponível na nuvem (VPS)"
      >
        <Cloud className="h-3 w-3" />
        Nuvem
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300"
      title="Só neste computador — ainda não enviado ao VPS"
    >
      <HardDrive className="h-3 w-3" />
      Local
    </span>
  );
}

export function PackSyncUploadButton({
  packId,
  disabled,
  onDone,
}: {
  packId: string;
  disabled?: boolean;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function upload(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sync-vps/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packIds: [packId] }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) alert(data.error ?? "Erro ao enfileirar envio");
      else onDone?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void upload(e)}
      disabled={disabled || loading}
      className="inline-flex items-center gap-1 rounded-md bg-violet-600/90 px-2 py-1 text-[10px] font-medium text-white hover:bg-violet-500 disabled:opacity-40"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Cloud className="h-3 w-3" />}
      Enviar VPS
    </button>
  );
}
