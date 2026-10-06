"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CloudUpload, Loader2, Music2, Pencil } from "lucide-react";
import { PackSyncBadge, usePackSyncStatus } from "@/components/PackSyncStatus";
import { PackDeleteButton } from "@/components/PackDeleteButton";
import { SyncPacksFolderButton } from "@/components/SyncPacksFolderButton";
import { isManagerModeClient } from "@/lib/app-mode-client";

type PackRow = {
  id: string;
  slug: string;
  name: string;
  producer: string | null;
  coverPath: string | null;
  sampleCount: number;
};

export function AdminPacksClient({ packs }: { packs: PackRow[] }) {
  const isManager = isManagerModeClient();
  const showSync = isManager;
  const { syncEnabled, onVpsBySlug, queueRunning, remoteError, refresh } =
    usePackSyncStatus(showSync);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);

  const localOnly = useMemo(
    () => packs.filter((p) => syncEnabled && !onVpsBySlug[p.slug]),
    [packs, syncEnabled, onVpsBySlug],
  );

  function toggleAll() {
    const ids = localOnly.map((p) => p.id);
    if (selected.size === ids.length) setSelected(new Set());
    else setSelected(new Set(ids));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function startUpload(all: boolean) {
    setUploading(true);
    try {
      const res = await fetch("/api/admin/sync-vps/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { packIds: [...selected] }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) alert(data.error ?? "Erro ao iniciar envio");
      else await refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Gerenciar packs</h1>
      <p className="mb-4 text-sm text-zinc-500">
        {isManager
          ? "Edite nome e capa, exclua duplicados, atualize a pasta local ou envie ao VPS."
          : "Edite nome, capa ou exclua packs duplicados do servidor."}{" "}
        {isManager && syncEnabled && (
          <span className="inline-flex items-center gap-2">
            <PackSyncBadge onVps={true} /> na nuvem · <PackSyncBadge onVps={false} /> só no PC
          </span>
        )}
      </p>

      {isManager && <SyncPacksFolderButton />}

      {isManager && syncEnabled && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <CloudUpload className="h-5 w-5 text-violet-400" />
          <div className="min-w-[200px] flex-1">
            <p className="text-sm font-medium text-zinc-200">Enviar para o VPS</p>
            <p className="text-xs text-zinc-500">
              {localOnly.length} pack(s) só local · fila envia um por vez
            </p>
            {remoteError && (
              <p className="mt-1 text-xs text-rose-400">VPS: {remoteError}</p>
            )}
          </div>
          <Link
            href="/admin/sync-vps"
            className="text-xs text-violet-400 hover:underline"
          >
            Configurar VPS
          </Link>
          <button
            type="button"
            disabled={queueRunning || uploading || selected.size === 0}
            onClick={() => void startUpload(false)}
            className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
          >
            Enviar selecionados ({selected.size})
          </button>
          <button
            type="button"
            disabled={queueRunning || uploading || localOnly.length === 0}
            onClick={() => void startUpload(true)}
            className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-40"
          >
            {queueRunning || uploading ? (
              <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
            ) : (
              `Enviar todos (${localOnly.length})`
            )}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-[#0d0d12] text-left text-[10px] uppercase tracking-wider text-zinc-500">
              {isManager && syncEnabled && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={localOnly.length > 0 && selected.size === localOnly.length}
                    onChange={toggleAll}
                    disabled={queueRunning}
                  />
                </th>
              )}
              <th className="px-4 py-3">Capa</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Samples</th>
              {isManager && syncEnabled && <th className="px-4 py-3">Sync</th>}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {packs.map((pack) => {
              const coverUrl = pack.coverPath
                ? `/api/covers/${pack.id}?v=${encodeURIComponent(pack.coverPath)}`
                : null;
              const onVps = onVpsBySlug[pack.slug];
              return (
                <tr key={pack.id} className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                  {isManager && syncEnabled && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={onVps || queueRunning}
                        checked={selected.has(pack.id)}
                        onChange={() => toggleOne(pack.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded bg-zinc-800">
                      {coverUrl ? (
                        <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Music2 className="h-5 w-5 text-zinc-600" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-100">{pack.name}</p>
                    {pack.producer && (
                      <p className="text-xs text-zinc-500">{pack.producer}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{pack.sampleCount}</td>
                  {isManager && syncEnabled && (
                    <td className="px-4 py-3">
                      <PackSyncBadge onVps={Boolean(onVps)} />
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/packs/${pack.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/15"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Link>
                      <PackDeleteButton
                        packId={pack.id}
                        packName={pack.name}
                        disabled={queueRunning}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
