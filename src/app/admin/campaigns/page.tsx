"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { CAMPAIGN_TEMPLATES, templateConfig } from "@/lib/campaigns/templates";
import type { CampaignOption, CampaignType } from "@/lib/campaigns/types";
import { cn } from "@/lib/utils";

type CampaignRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  options: CampaignOption[];
  allowText: boolean;
  autoSubmitOnOption: boolean;
  active: boolean;
  createdAt: string;
  opened: number;
  responded: number;
  optionCounts: Array<{ id: string; label: string; count: number }>;
};

function emptyForm(type: CampaignType = "notice") {
  const config = templateConfig(type);
  return {
    title: "",
    body: "",
    type,
    options: [{ id: "1", label: "" }] as CampaignOption[],
    allowText: config.allowText,
    autoSubmitOnOption: config.autoSubmitOnOption,
    active: true,
  };
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/campaigns");
      const data = (await res.json()) as { campaigns?: CampaignRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Falha ao carregar");
        return;
      }
      setCampaigns(data.campaigns ?? []);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function selectTemplate(type: CampaignType) {
    const config = templateConfig(type);
    setForm((prev) => ({
      ...prev,
      type,
      allowText: config.allowText,
      autoSubmitOnOption: config.autoSubmitOnOption,
      options:
        type === "poll" || type === "mixed"
          ? prev.options.length > 0
            ? prev.options
            : [{ id: "1", label: "" }]
          : [{ id: "1", label: "" }],
    }));
  }

  function updateOption(index: number, patch: Partial<CampaignOption>) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)),
    }));
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const options =
        form.type === "poll" || form.type === "mixed"
          ? form.options.filter((o) => o.label.trim()).slice(0, 4)
          : [];

      if ((form.type === "poll" || form.type === "mixed") && options.length < 2) {
        setError("Enquetes precisam de pelo menos 2 opções");
        return;
      }

      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, options }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Falha ao criar");
        return;
      }
      setForm(emptyForm(form.type));
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: CampaignRow) {
    await fetch(`/api/admin/campaigns/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    await load();
  }

  async function removeCampaign(id: string) {
    if (!window.confirm("Excluir esta campanha?")) return;
    await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
    await load();
  }

  const showOptions = form.type === "poll" || form.type === "mixed";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-violet-400" />
          <h1 className="text-2xl font-semibold">Campanhas</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Envie avisos, enquetes e mensagens para usuários do BeatStack Manager.
        </p>
      </div>

      <form
        onSubmit={(e) => void createCampaign(e)}
        className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-5"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Plus className="h-4 w-4" /> Nova campanha
        </h2>

        <div>
          <p className="mb-2 text-xs text-zinc-500">Tipo de campanha</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CAMPAIGN_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template.id)}
                className={cn(
                  "rounded-lg border px-3 py-3 text-left transition-colors",
                  form.type === template.id
                    ? "border-violet-500/50 bg-violet-500/10"
                    : "border-white/10 bg-black/20 hover:border-white/20",
                )}
              >
                <p className="text-sm font-medium text-zinc-100">{template.label}</p>
                <p className="mt-1 text-xs text-zinc-500">{template.description}</p>
              </button>
            ))}
          </div>
        </div>

        <input
          required
          placeholder="Título"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
        />

        <textarea
          required
          rows={4}
          placeholder="Mensagem"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
        />

        {showOptions && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">Opções da enquete (até 4)</p>
            {form.options.map((opt, i) => (
              <input
                key={opt.id}
                placeholder={`Opção ${i + 1}`}
                value={opt.label}
                onChange={(e) => updateOption(i, { label: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
            ))}
            {form.options.length < 4 && (
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    options: [
                      ...form.options,
                      { id: String(form.options.length + 1), label: "" },
                    ],
                  })
                }
                className="text-xs text-sky-400 hover:underline"
              >
                + Adicionar opção
              </button>
            )}
          </div>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Publicar campanha"}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">Campanhas publicadas</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Carregando...</p>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma campanha ainda.</p>
        ) : (
          campaigns.map((c) => {
            const typeLabel =
              CAMPAIGN_TEMPLATES.find((t) => t.id === c.type)?.label ?? c.type;
            return (
            <div
              key={c.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-100">{c.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {typeLabel} · {new Date(c.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleActive(c)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.active ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-700 text-zinc-400"
                    }`}
                  >
                    {c.active ? "Ativa" : "Pausada"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeCampaign(c.id)}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-sm text-zinc-400">
                <span>Aberturas: {c.opened}</span>
                <span>Respostas: {c.responded}</span>
              </div>
              {c.optionCounts.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                  {c.optionCounts.map((o) => (
                    <li key={o.id}>
                      {o.label}: {o.count}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            );
          })
        )}
      </section>
    </div>
  );
}
