"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Upload,
  AlertCircle,
  FileArchive,
  FolderOpen,
  ImagePlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  collectFilesFromDataTransfer,
  countAudioInFolder,
  isSupportedArchiveFile,
  type FolderFileEntry,
} from "@/lib/import/folder-client";
import {
  inferPackMetaFromSource,
  PACK_GENRE_OPTIONS,
  genreLabel,
} from "@/lib/pack-genres";
import { CopyrightUploadNotice } from "@/components/legal/CopyrightUploadNotice";
import { ManagerStoragePanel } from "@/components/ManagerStoragePanel";
import { SyncPacksFolderButton } from "@/components/SyncPacksFolderButton";
import { hasCurrentLegalAcceptance } from "@/lib/legal/acceptance-client";
import { isManagerModeClient } from "@/lib/app-mode-client";

interface ImportResult {
  success: boolean;
  packId: string;
  slug: string;
  sampleCount: number;
  presetCount?: number;
  presetKinds?: string[];
  message: string;
}

type ImportMode = "archive" | "folder" | "localPath";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportPage() {
  const router = useRouter();
  const isManager = isManagerModeClient();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("archive");
  const [file, setFile] = useState<File | null>(null);
  const [folderEntries, setFolderEntries] = useState<FolderFileEntry[]>([]);
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [packName, setPackName] = useState("");
  const [producer, setProducer] = useState("");
  const [genre, setGenre] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [autoGenres, setAutoGenres] = useState<string[]>([]);
  const [userEditedName, setUserEditedName] = useState(false);
  const [userEditedProducer, setUserEditedProducer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [authDisabled, setAuthDisabled] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { authDisabled?: boolean }) => {
        setAuthDisabled(Boolean(d.authDisabled));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (authDisabled || isManager) return;
    void hasCurrentLegalAcceptance().then((ok) => {
      if (!ok) {
        router.replace("/legal/accept?next=/admin/import");
      }
    });
  }, [router, authDisabled, isManager]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const hasSelection = Boolean(file || folderEntries.length > 0 || localPath);

  const resetSelection = useCallback(() => {
    setFile(null);
    setFolderEntries([]);
    setLocalPath(null);
    setMode("archive");
    setAutoGenres([]);
    setCoverFile(null);
  }, []);

  function applyAutoFromSource(sourceName: string) {
    const meta = inferPackMetaFromSource(sourceName);
    if (!userEditedName) setPackName(meta.suggestedName);
    if (!userEditedProducer && meta.producer) setProducer(meta.producer);
    setAutoGenres(meta.genres);
    setGenre(meta.primaryGenre ?? "");
  }

  function folderSourceName(entries: FolderFileEntry[]): string {
    const first = entries[0]?.path.replace(/\\/g, "/") ?? "";
    const root = first.split("/")[0];
    return root || first || "Pasta importada";
  }

  function resolveGenreToSend(): string {
    if (genre === "__custom__") {
      return customGenre.trim().toLowerCase().replace(/\s+/g, "-");
    }
    return genre.trim() || autoGenres[0] || "";
  }

  async function coverToPayload(): Promise<
    { base64: string; mimeType: string; fileName: string } | undefined
  > {
    if (!coverFile) return undefined;
    const buffer = await coverFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    return {
      base64: btoa(binary),
      mimeType: coverFile.type || "image/jpeg",
      fileName: coverFile.name,
    };
  }

  async function submitImport() {
    if (!authDisabled && !isManager) {
      const legalOk = await hasCurrentLegalAcceptance();
      if (!legalOk) {
        router.push("/legal/accept?next=/admin/import");
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const genreToSend = resolveGenreToSend();
    if (genre === "__custom__" && !genreToSend) {
      setError("Escreva o nome do gênero manualmente");
      setLoading(false);
      return;
    }

    try {
      if (mode === "localPath" && localPath) {
        const cover = await coverToPayload();
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            importType: "localPath",
            sourceDirectory: localPath,
            packName: packName.trim() || undefined,
            producer: producer.trim() || undefined,
            genre: genreToSend || undefined,
            cover,
          }),
        });
        let data: ImportResult & { error?: string } = {
          success: false,
          packId: "",
          slug: "",
          sampleCount: 0,
          message: "",
        };
        try {
          data = (await res.json()) as typeof data;
        } catch {
          setError(
            res.ok
              ? "Resposta inválida do servidor"
              : `Falha na importação (HTTP ${res.status}). Packs grandes podem demorar — tente de novo.`,
          );
          return;
        }
        if (!res.ok) {
          setError(data.error || "Falha na importação");
        } else {
          setResult(data);
          resetSelection();
          router.refresh();
        }
        return;
      }

      if (mode === "folder" && folderEntries.length > 200 && isManager) {
        setError(
          `Esta pasta tem ${folderEntries.length} arquivos. No Manager use “Pasta no disco (packs grandes)” — não “Selecionar pasta”. Assim o app lê direto do HD sem upload.`,
        );
        return;
      }

      const formData = new FormData();
      if (packName.trim()) formData.append("packName", packName.trim());
      if (producer.trim()) formData.append("producer", producer.trim());
      if (genreToSend) formData.append("genre", genreToSend);
      if (coverFile) formData.append("cover", coverFile);

      if (mode === "folder" && folderEntries.length > 0) {
        formData.append("importType", "folder");
        for (const entry of folderEntries) {
          formData.append("files", entry.file);
          formData.append("paths", entry.path);
        }
      } else if (file) {
        formData.append("importType", "archive");
        formData.append("file", file);
      } else {
        setError("Selecione um arquivo (.zip / .rar) ou uma pasta");
        return;
      }

      const res = await fetch("/api/import", { method: "POST", body: formData });
      let data: ImportResult & { error?: string } = {
        success: false,
        packId: "",
        slug: "",
        sampleCount: 0,
        message: "",
      };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError(
          isManager
            ? "Falha ao enviar. Para packs grandes, use “Pasta no disco (packs grandes)”."
            : "Erro de rede ao enviar o arquivo",
        );
        return;
      }
      if (!res.ok) {
        setError(data.error || "Falha na importação");
      } else {
        setResult(data);
        resetSelection();
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        isManager
          ? `Falha ao importar${msg ? `: ${msg}` : ""}. Para packs grandes (5 GB+), use “Pasta no disco (packs grandes)”.`
          : "Erro de rede ao enviar o arquivo",
      );
    } finally {
      setLoading(false);
    }
  }

  async function pickLocalDiskFolder() {
    if (!window.beatstack?.selectDirectory) {
      setError("Pasta no disco só funciona no app desktop BeatStack Manager");
      return;
    }
    const picked = await window.beatstack.selectDirectory({
      title: "Selecionar pasta já extraída do pack",
    });
    if (!picked.ok || !picked.path) return;
    setError(null);
    setLocalPath(picked.path);
    setFile(null);
    setFolderEntries([]);
    setMode("localPath");
    applyAutoFromSource(picked.path.split(/[/\\]/).pop() || "Pasta importada");
  }

  function pickArchive(selected: File | null) {
    if (!selected) return;
    if (!isSupportedArchiveFile(selected)) {
      setError(`"${selected.name}" não é .zip ou .rar. Selecione pasta ou converta o arquivo.`);
      return;
    }
    setError(null);
    setFile(selected);
    setFolderEntries([]);
    setMode("archive");
    applyAutoFromSource(selected.name);
  }

  function pickFolderFromInput(fileList: FileList | null) {
    if (!fileList?.length) return;
    const entries: FolderFileEntry[] = [];
    for (const f of fileList) {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      entries.push({ file: f, path: rel });
    }
    const audioCount = countAudioInFolder(entries);
    if (audioCount === 0) {
      setError("Nenhum áudio (.wav, .mp3, .flac…) encontrado nesta pasta");
      return;
    }
    if (isManager && entries.length > 200) {
      setError(
        `Pasta com ${entries.length} arquivos — use o botão azul “Pasta no disco (packs grandes)”. “Selecionar pasta” só serve para pastas pequenas.`,
      );
      setFolderEntries([]);
      setFile(null);
      setLocalPath(null);
      return;
    }
    setError(null);
    setFolderEntries(entries);
    setFile(null);
    setLocalPath(null);
    setMode("folder");
    applyAutoFromSource(folderSourceName(entries));
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const entries = await collectFilesFromDataTransfer(e.dataTransfer);
    if (entries.length === 0) return;

    if (entries.length === 1 && isSupportedArchiveFile(entries[0].file)) {
      pickArchive(entries[0].file);
      return;
    }

    const audioCount = countAudioInFolder(entries);
    if (audioCount === 0) {
      setError("Arraste um .zip, .rar ou uma pasta com samples de áudio");
      return;
    }

    setError(null);
    setFolderEntries(entries);
    setFile(null);
    setMode("folder");
    applyAutoFromSource(folderSourceName(entries));
  }

  return (
    <div className="mx-auto max-w-xl">
      {!authDisabled && !isManager && <CopyrightUploadNotice onAcknowledged={() => {}} />}
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Importar sample pack</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Aceita <strong className="text-zinc-400">.zip</strong>,{" "}
        <strong className="text-zinc-400">.rar</strong> ou{" "}
        <strong className="text-zinc-400">pasta descompactada</strong>. Para arquivos grandes
        (5–15 GB), extraia fora do app e use <strong className="text-zinc-400">Pasta no disco</strong>.
      </p>

      {isManager && <ManagerStoragePanel />}
      {isManager && <SyncPacksFolderButton />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitImport();
        }}
        className="space-y-5 rounded-xl border border-white/10 bg-[#141418] p-6"
      >
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Arquivo ou pasta *</label>
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={(e) => void handleDrop(e)}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-10 transition",
              dragging
                ? "border-violet-400 bg-violet-500/10"
                : "border-white/15 bg-[#0d0d0f] hover:border-violet-500/40",
            )}
          >
            {mode === "archive" && file ? (
              <>
                <FileArchive className="mb-2 h-8 w-8 text-violet-400" />
                <span className="text-sm font-medium text-zinc-200">{file.name}</span>
                <span className="mt-1 text-xs text-zinc-500">{formatSize(file.size)}</span>
              </>
            ) : mode === "localPath" && localPath ? (
              <>
                <FolderOpen className="mb-2 h-8 w-8 text-sky-400" />
                <span className="text-sm font-medium text-zinc-200">Pasta no disco</span>
                <span className="mt-1 max-w-full break-all px-2 text-center text-xs text-zinc-500">
                  {localPath}
                </span>
              </>
            ) : mode === "folder" && folderEntries.length > 0 ? (
              <>
                <FolderOpen className="mb-2 h-8 w-8 text-violet-400" />
                <span className="text-sm font-medium text-zinc-200">Pasta selecionada</span>
                <span className="mt-1 text-xs text-zinc-500">
                  {folderEntries.length} arquivo(s) · {countAudioInFolder(folderEntries)} áudio(s)
                </span>
              </>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-zinc-600" />
                <span className="text-sm text-zinc-400">
                  {dragging ? "Solte aqui..." : "Arraste .zip, .rar ou pasta"}
                </span>
              </>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/15">
                Arquivo ZIP/RAR
                <input
                  type="file"
                  accept=".zip,.rar,application/zip,application/x-rar-compressed,application/vnd.rar"
                  className="hidden"
                  onChange={(e) => pickArchive(e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/15"
              >
                Pasta pequena
              </button>
              {isManager && (
                <button
                  type="button"
                  onClick={() => void pickLocalDiskFolder()}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium text-white",
                    mode === "localPath" ? "bg-sky-500 ring-2 ring-sky-300/40" : "bg-sky-600/80 hover:bg-sky-500",
                  )}
                >
                  Pasta no disco (packs grandes)
                </button>
              )}
              <input
                ref={folderInputRef}
                type="file"
                className="hidden"
                multiple
                {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                onChange={(e) => pickFolderFromInput(e.target.files)}
              />
            </div>
          </div>
          {isManager && (
            <p className="mt-2 text-xs text-zinc-600">
              Packs grandes: extraia com WinRAR/7-Zip em{" "}
              <strong className="text-zinc-400">D:\…\packs\NomeDoPack</strong> e use o botão azul{" "}
              <strong className="text-zinc-400">Pasta no disco</strong> (não “Pasta pequena”).
            </p>
          )}
        </div>

        {autoGenres.length > 0 ? (
          <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2.5 text-sm text-sky-200">
            Gênero detectado:{" "}
            {autoGenres.map((g) => (
              <span key={g} className="mr-2 font-medium">
                #{g}
              </span>
            ))}
            <span className="text-sky-300/70">— confira abaixo ou ajuste manualmente</span>
          </div>
        ) : (file || folderEntries.length > 0 || localPath) ? (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
            Gênero não detectado automaticamente — selecione o tipo do pack abaixo para facilitar
            nas buscas.
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Nome do pack</label>
          <input
            type="text"
            value={packName}
            onChange={(e) => {
              setUserEditedName(true);
              setPackName(e.target.value);
            }}
            placeholder="Preenchido automaticamente ao selecionar arquivo"
            className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm focus:border-violet-500/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Produtor</label>
          <input
            type="text"
            value={producer}
            onChange={(e) => {
              setUserEditedProducer(true);
              setProducer(e.target.value);
            }}
            placeholder="Ex: Antidote Audio"
            className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm focus:border-violet-500/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Gênero / hashtag do pack</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
          >
            {PACK_GENRE_OPTIONS.map((opt) => (
              <option key={opt.value || "auto"} value={opt.value}>
                {opt.value === "" && autoGenres.length > 0
                  ? `Automático (${autoGenres.map((g) => genreLabel(g)).join(", ")})`
                  : opt.label}
              </option>
            ))}
          </select>
          {genre === "__custom__" && (
            <input
              type="text"
              value={customGenre}
              onChange={(e) => setCustomGenre(e.target.value)}
              placeholder="Ex: baile-funk, riddim, ambient..."
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm focus:border-violet-500/50 focus:outline-none"
            />
          )}
          <p className="mt-1.5 text-xs text-zinc-600">
            Aparece como filtro na biblioteca (#dubstep, #dnb, etc.). Use “Outro” para escrever
            qualquer estilo.
          </p>
        </div>

        {hasSelection && (
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">
              Capa do pack (opcional)
            </label>
            <div className="flex items-start gap-3">
              {coverPreview ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#0d0d0f]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="Preview da capa" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#0d0d0f]">
                  <ImagePlus className="h-6 w-6 text-zinc-600" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/15 bg-[#0d0d0f] px-4 py-3 transition hover:border-violet-500/30">
                  <ImagePlus className="h-5 w-5 shrink-0 text-zinc-500" />
                  <span className="truncate text-sm text-zinc-400">
                    {coverFile ? coverFile.name : "JPG, PNG ou WebP"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {coverFile && (
                  <button
                    type="button"
                    onClick={() => setCoverFile(null)}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="h-3 w-3" />
                    Remover capa
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (!file && folderEntries.length === 0 && !localPath)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importando... (packs grandes podem demorar)
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
          {result.presetCount != null && result.presetCount > 0 && (
            <p className="mt-2 text-xs text-amber-300/80">
              Presets disponível — abra o pack para baixar
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <Link href={`/packs/${result.slug}`} className="text-violet-400 hover:text-violet-300">
              Ver pack importado →
            </Link>
            <Link href="/" className="text-zinc-400 hover:text-zinc-200">
              Ir para biblioteca →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
