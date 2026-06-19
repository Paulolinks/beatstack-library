"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePlus, Loader2, Pencil, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PACK_GENRE_OPTIONS } from "@/lib/pack-genres";

type PackAdminEditorProps = {
  packId: string;
  initialName: string;
  initialProducer: string | null;
  initialGenre: string | null;
  hasCover: boolean;
  className?: string;
} & (
  | { mode: "button"; onOpen: () => void }
  | { mode: "panel"; onClose: () => void }
);

export function PackAdminEditor(props: PackAdminEditorProps) {
  const { packId, initialName, initialProducer, initialGenre, hasCover, className } = props;
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [producer, setProducer] = useState(initialProducer ?? "");
  const [genre, setGenre] = useState(initialGenre ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (props.mode === "button") {
    return (
      <button
        type="button"
        onClick={props.onOpen}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-400 transition hover:bg-amber-500/20",
          className,
        )}
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar pack
      </button>
    );
  }

  const onClose = props.mode === "panel" ? props.onClose : undefined;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const nameChanged = name.trim() !== initialName;
      const producerChanged = producer.trim() !== (initialProducer ?? "");
      const genreChanged = genre.trim() !== (initialGenre ?? "");

      if (nameChanged || producerChanged || genreChanged) {
        const res = await fetch(`/api/packs/${packId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            producer: producer.trim() || null,
            genre: genre.trim() || null,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Falha ao salvar pack");
      }

      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        const res = await fetch(`/api/packs/${packId}/cover`, {
          method: "POST",
          body: formData,
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Falha ao enviar capa");
      }

      onClose?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSave(e)}
      className={cn(
        "rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-500/80">
          Admin — editar pack
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Nome do pack</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm focus:border-amber-500/40 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Produtor</label>
          <input
            type="text"
            value={producer}
            onChange={(e) => setProducer(e.target.value)}
            placeholder="Opcional"
            className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm focus:border-amber-500/40 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Gênero / hashtag</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/40 focus:outline-none"
          >
            <option value="">Nenhum</option>
            {PACK_GENRE_OPTIONS.filter((o) => o.value).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-sm text-zinc-400">
          Capa do pack {hasCover ? "(substituir)" : "(adicionar)"}
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/15 bg-[#0d0d0f] px-4 py-3 transition hover:border-amber-500/30">
          <ImagePlus className="h-5 w-5 shrink-0 text-zinc-500" />
          <span className="text-sm text-zinc-400">
            {coverFile ? coverFile.name : "JPG, PNG ou WebP"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-4 flex items-center gap-2 rounded-lg bg-amber-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Salvar alterações
          </>
        )}
      </button>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </form>
  );
}
