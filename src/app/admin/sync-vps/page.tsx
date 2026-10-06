"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PackRow = {
  id: string;
  slug: string;
  name: string;
  producer: string | null;
  sampleCount: number;
  sizeLabel: string;
  onVps: boolean;
  remotePackId?: string | null;
  syncStatus: "remote" | "local_only";
};

type QueueItem = {
  packId: string;
  slug: string;
  name: string;
  status: string;
  progress: number;
  phase: string;
  error?: string;
};

type StatusResponse = {
  enabled: boolean;
  error?: string;
  remoteError?: string | null;
  config?: { vpsUrl: string; email: string; hasPassword: boolean } | null;
  packs?: PackRow[];
  queue?: {
    running: boolean;
    summary: string | null;
    items: QueueItem[];
  };
};

export default function SyncVpsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState<StatusResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [vpsUrl, setVpsUrl] = useState("https://library.paulolinks.com");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sync-vps/status");
      const json = (await res.json()) as StatusResponse;
      setData(json);
      if (json.config?.vpsUrl) setVpsUrl(json.config.vpsUrl);
      if (json.config?.email) setEmail(json.config.email);
      if (json.packs) {
        const pending = json.packs.filter((p) => !p.onVps).map((p) => p.id);
        setSelected(new Set(pending));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.queue?.running) return;
    const id = setInterval(() => void load(), 3000);
    return () => clearInterval(id);
  }, [data?.queue?.running, load]);

  const localOnly = useMemo(
    () => data?.packs?.filter((p) => !p.onVps) ?? [],
    [data?.packs],
  );

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/sync-vps/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpsUrl, email, password: password || undefined }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "Erro ao salvar");
        return;
      }
      setPassword("");
      setMessage("Conexão OK. Configuração salva.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  function toggleAll() {
    if (!data?.packs) return;
    const pending = data.packs.filter((p) => !p.onVps).map((p) => p.id);
    if (selected.size === pending.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteFromVps(pack: PackRow) {
    if (!pack.remotePackId) return;
    if (
      !window.confirm(
        `Excluir "${pack.name}" do VPS?\n\nO pack continua no seu PC e os samples salvos nas pastas de favoritos não são apagados.`,
      )
    ) {
      return;
    }
    setDeletingId(pack.remotePackId);
    setMessage(null);
    try {
      const res = await fetch(`/api/vps/packs/${encodeURIComponent(pack.remotePackId)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string; fileErrors?: string[] };
      if (!res.ok) {
        setMessage(`Erro ao excluir do VPS: ${json.error ?? res.status}`);
        return;
      }
      setMessage(
        json.fileErrors?.length
          ? `"${pack.name}" removido do VPS (alguns arquivos não puderam ser apagados: ${json.fileErrors.length}).`
          : `"${pack.name}" removido do VPS.`,
      );
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  async function startUpload(all = false) {
    setUploading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/sync-vps/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          all ? { all: true } : { packIds: Array.from(selected) },
        ),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "Erro ao iniciar envio");
        return;
      }
      setMessage("Envio iniciado. Pode deixar o app aberto — um pack por vez.");
      await load();
    } finally {
      setUploading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando…
      </div>
    );
  }

  if (data && !data.enabled) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-zinc-300">
        <p className="font-medium text-amber-300">Sync VPS indisponível neste servidor</p>
        <p className="mt-2 text-sm text-zinc-400">
          Use o BeatStack Library <strong>localmente</strong> no PC onde estão os packs
          (npm run dev ou app desktop sem URL remota). A sincronização envia do seu disco
          para o VPS — não funciona pelo navegador do VPS.
        </p>
      </div>
    );
  }

  const queueRunning = data?.queue?.running;

  return (
    <div className="max-w-5xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <CloudUpload className="h-7 w-7 text-violet-400" />
            Enviar packs para o VPS
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Compare o que está só no seu PC com o que já está na nuvem. Cada pack sobe
            arquivo por arquivo, em partes de 32 MB (retoma se a conexão cair) — funciona com
            packs grandes. Deixe o app aberto; os packs sobem um por vez. Excluir do VPS não
            apaga o pack do PC nem os samples salvos nos favoritos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {message && (
        <div
          className={cn(
            "mb-6 rounded-lg border px-4 py-3 text-sm",
            message.includes("Erro") ||
              message.includes("incorret") ||
              message.includes("SSH") ||
              message.includes("inválid")
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : "border-sky-500/30 bg-sky-500/10 text-sky-200",
          )}
        >
          {message}
        </div>
      )}

      {data?.remoteError && (
        <div className="mb-6 flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          VPS: {data.remoteError}
        </div>
      )}

      <form
        onSubmit={(e) => void saveConfig(e)}
        className="mb-8 rounded-xl border border-white/10 bg-[#141418] p-6"
      >
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Conexão com o VPS
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-zinc-500">URL do Library (VPS)</span>
            <input
              value={vpsUrl}
              onChange={(e) => setVpsUrl(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm"
              placeholder="https://library.paulolinks.com"
            />
            <span className="mt-1 block text-[11px] text-zinc-600">
              URL HTTPS do BeatStack Library — <strong>não</strong> use SSH (root@IP). É o mesmo site
              onde você faz login no Library online.
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-500">E-mail admin</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-[11px] text-zinc-600">
              Senha da conta admin no <strong>Library</strong> (library.*), não do painel de licenças.
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-500">
              Senha {data?.config?.hasPassword ? "(deixe vazio para manter)" : ""}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar conexão"}
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!data?.config || queueRunning || uploading || selected.size === 0}
          onClick={() => void startUpload(false)}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {queueRunning || uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Enviar selecionados ({selected.size})
        </button>
        <button
          type="button"
          disabled={!data?.config || queueRunning || uploading || localOnly.length === 0}
          onClick={() => void startUpload(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-40"
        >
          Enviar todos pendentes ({localOnly.length})
        </button>
        <Link
          href="/admin/packs"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          Gerenciar packs →
        </Link>
      </div>

      {data?.queue && data.queue.items.length > 0 && (
        <div className="mb-6 rounded-xl border border-white/10 bg-[#0d0d12] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-300">
              {queueRunning ? "Enviando…" : "Última fila"}
            </p>
            {data.queue.summary && (
              <p className="text-xs text-zinc-500">{data.queue.summary}</p>
            )}
          </div>
          <ul className="space-y-2">
            {data.queue.items.map((item) => (
              <li
                key={item.packId}
                className="rounded-lg border border-white/5 bg-[#141418] px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-zinc-200">{item.name}</span>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">{item.phase}</p>
                {item.error && (
                  <p className="mt-1 text-xs text-rose-400">{item.error}</p>
                )}
                {(item.status === "zipping" || item.status === "uploading") && item.progress > 0 && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-violet-500 transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-[#0d0d12] text-left text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={
                    localOnly.length > 0 && selected.size === localOnly.length
                  }
                  onChange={toggleAll}
                  className="rounded border-zinc-600"
                />
              </th>
              <th className="px-4 py-3">Pack</th>
              <th className="px-4 py-3">Samples</th>
              <th className="px-4 py-3">Tamanho</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.packs?.map((pack) => (
              <tr
                key={pack.id}
                className="border-b border-white/[0.06] hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    disabled={pack.onVps || queueRunning}
                    checked={selected.has(pack.id)}
                    onChange={() => toggleOne(pack.id)}
                    className="rounded border-zinc-600 disabled:opacity-30"
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-100">{pack.name}</p>
                  <p className="text-xs text-zinc-600">{pack.slug}</p>
                </td>
                <td className="px-4 py-3 text-zinc-400">{pack.sampleCount}</td>
                <td className="px-4 py-3 text-zinc-400">{pack.sizeLabel}</td>
                <td className="px-4 py-3">
                  {pack.onVps ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        No VPS
                      </span>
                      {pack.remotePackId && (
                        <button
                          type="button"
                          disabled={deletingId === pack.remotePackId || queueRunning}
                          onClick={() => void deleteFromVps(pack)}
                          title="Apaga só no VPS. O pack no seu PC e os favoritos continuam."
                          className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 px-2 py-0.5 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
                        >
                          {deletingId === pack.remotePackId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Excluir do VPS
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
                      Só local
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-zinc-500/20 text-zinc-400",
    zipping: "bg-violet-500/20 text-violet-300",
    uploading: "bg-sky-500/20 text-sky-300",
    done: "bg-emerald-500/20 text-emerald-300",
    skipped: "bg-zinc-500/20 text-zinc-400",
    failed: "bg-rose-500/20 text-rose-300",
  };
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
        styles[status] ?? styles.pending,
      )}
    >
      {status}
    </span>
  );
}
