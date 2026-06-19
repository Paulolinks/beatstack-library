import { copyFileToClipboard } from "@/lib/clipboard-client";

export type CopyFolder = "downloads" | "likes" | "copied";

export function isDesktopClient(): boolean {
  return typeof window !== "undefined" && !!window.beatstack?.isDesktop;
}

export function isLocalServer(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/** Servidor Next.js rodando no mesmo PC (localhost). */
export function isLocalApp(): boolean {
  return isLocalServer();
}

/** UI e fluxo estilo Splice (copiar, não só download no navegador). */
export function usesCopyFlow(): boolean {
  return isDesktopClient() || isLocalServer();
}

async function copySampleOnLocalServer(
  sampleId: string,
  folder: CopyFolder,
): Promise<{ ok: boolean; path?: string; clipboardOk?: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/samples/${sampleId}/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    });
    const data = (await res.json()) as { path?: string; error?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Falha ao copiar sample" };
    }

    let clipboardOk = false;
    if (data.path) {
      clipboardOk = await copyFileToClipboard(data.path);
    }

    return { ok: true, path: data.path, clipboardOk };
  } catch {
    return { ok: false, error: "Erro de rede ao copiar sample" };
  }
}

async function copySampleFromRemoteServer(
  sampleId: string,
  fileName: string,
  folder: CopyFolder,
  packSlug: string,
): Promise<{ ok: boolean; path?: string; clipboardOk?: boolean; error?: string }> {
  if (!window.beatstack?.saveSampleLocal) {
    return { ok: false, error: "App desktop não suporta cópia remota nesta versão" };
  }

  try {
    const res = await fetch(`/api/samples/${sampleId}/download`);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error ?? "Falha ao baixar sample do servidor" };
    }

    const buffer = await res.arrayBuffer();
    const result = await window.beatstack.saveSampleLocal({
      folder,
      packSlug,
      fileName,
      buffer,
    });

    if (!result.ok) {
      return { ok: false, error: result.error ?? "Falha ao salvar sample no PC" };
    }

    return {
      ok: true,
      path: result.path,
      clipboardOk: result.clipboardOk,
    };
  } catch {
    return { ok: false, error: "Erro de rede ao copiar sample do VPS" };
  }
}

/**
 * Modo Splice local: copia via API no servidor local.
 * Modo desktop + VPS: baixa do VPS e salva em Documents/BeatStack Library.
 */
export async function copySampleToLibrary(
  sampleId: string,
  fileName: string,
  folder: CopyFolder = "downloads",
  packSlug = "pack",
): Promise<{ ok: boolean; path?: string; clipboardOk?: boolean; error?: string }> {
  if (isLocalServer()) {
    return copySampleOnLocalServer(sampleId, folder);
  }
  if (isDesktopClient()) {
    return copySampleFromRemoteServer(sampleId, fileName, folder, packSlug);
  }
  return { ok: false, error: "Cópia local disponível apenas no app desktop ou localhost" };
}

export async function downloadSampleFile(
  sampleId: string,
  fileName: string,
  folder: CopyFolder = "downloads",
  packSlug = "pack",
): Promise<{ ok: boolean; path?: string; clipboardOk?: boolean; mode: "copy" | "download"; error?: string }> {
  if (usesCopyFlow()) {
    const result = await copySampleToLibrary(sampleId, fileName, folder, packSlug);
    return { ...result, mode: "copy" };
  }

  try {
    const res = await fetch(`/api/samples/${sampleId}/download`);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, mode: "download", error: data.error ?? "Falha ao baixar sample" };
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/[<>:"/\\|?*]/g, "_");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { ok: true, mode: "download" };
  } catch {
    return { ok: false, mode: "download", error: "Erro de rede ao baixar sample" };
  }
}
