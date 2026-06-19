"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Upload, AlertCircle } from "lucide-react";

interface ImportResult {
  success: boolean;
  packId: string;
  slug: string;
  sampleCount: number;
  message: string;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [packName, setPackName] = useState("");
  const [producer, setProducer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecione um arquivo ZIP");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    if (packName.trim()) formData.append("packName", packName.trim());
    if (producer.trim()) formData.append("producer", producer.trim());

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha na importação");
      } else {
        setResult(data as ImportResult);
        setFile(null);
      }
    } catch {
      setError("Erro de rede ao enviar o arquivo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Importar sample pack</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Envie um arquivo <strong className="text-zinc-400">.zip</strong> com seu pack. O app extrai,
        detecta a capa, classifica kicks/snares/bass/guitar e indexa tudo automaticamente.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-white/10 bg-[#141418] p-6"
      >
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Arquivo ZIP *</label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#0d0d0f] px-4 py-10 transition hover:border-violet-500/40">
            <Upload className="mb-2 h-8 w-8 text-zinc-600" />
            <span className="text-sm text-zinc-400">
              {file ? file.name : "Clique para selecionar ou arrastar"}
            </span>
            <input
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">
            Nome do pack (opcional)
          </label>
          <input
            type="text"
            value={packName}
            onChange={(e) => setPackName(e.target.value)}
            placeholder="Ex: Sullivan King Vol 3"
            className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm focus:border-violet-500/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">
            Produtor (opcional)
          </label>
          <input
            type="text"
            value={producer}
            onChange={(e) => setProducer(e.target.value)}
            placeholder="Ex: Sullivan King"
            className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm focus:border-violet-500/50 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importando... (pode demorar em packs grandes)
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Importar pack
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">{result.message}</span>
          </div>
          <Link
            href={`/packs/${result.slug}`}
            className="mt-3 inline-block text-sm text-violet-400 hover:text-violet-300"
          >
            Ver pack importado →
          </Link>
        </div>
      )}
    </div>
  );
}
