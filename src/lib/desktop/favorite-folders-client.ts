import { isManagerModeClient } from "@/lib/app-mode-client";
import { isDesktopClient } from "@/lib/download-sample-client";
import { dispatchFoldersChanged } from "@/lib/manager/favorite-folder-events";

export type FavoriteFolderRow = {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  diskPath?: string;
};

export function usesFavoriteFolders(): boolean {
  if (isManagerModeClient()) return true;
  return isDesktopClient() && Boolean(window.beatstack?.favoriteFolders);
}

async function listFromApi(): Promise<{
  folders: FavoriteFolderRow[];
  activeFavoriteFolderId: string | null;
}> {
  const res = await fetch("/api/manager/favorite-folders");
  const data = (await res.json()) as {
    folders?: FavoriteFolderRow[];
    activeFavoriteFolderId?: string | null;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? "Erro ao carregar pastas");
  }
  return {
    folders: data.folders ?? [],
    activeFavoriteFolderId: data.activeFavoriteFolderId ?? null,
  };
}

async function listFromDesktop(): Promise<{
  folders: FavoriteFolderRow[];
  activeFavoriteFolderId: string | null;
}> {
  const data = await window.beatstack!.favoriteFolders!.list();
  return {
    folders: data.folders ?? [],
    activeFavoriteFolderId: data.activeFavoriteFolderId ?? null,
  };
}

export async function listFavoriteFolders(): Promise<{
  folders: FavoriteFolderRow[];
  activeFavoriteFolderId: string | null;
}> {
  if (isManagerModeClient()) return listFromApi();
  if (window.beatstack?.favoriteFolders) return listFromDesktop();
  throw new Error("Pastas favoritas indisponíveis");
}

export async function createFavoriteFolder(name: string): Promise<{
  ok: boolean;
  error?: string;
  status?: number;
}> {
  if (isManagerModeClient()) {
    const res = await fetch("/api/manager/favorite-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json()) as { error?: string };
    return { ok: res.ok, error: data.error, status: res.status };
  }

  const result = await window.beatstack!.favoriteFolders!.create(name);
  return { ok: result.ok, error: result.error, status: result.status };
}

export async function setActiveFavoriteFolder(folderId: string | null): Promise<void> {
  if (isManagerModeClient()) {
    await fetch("/api/manager/favorite-folders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeFavoriteFolderId: folderId }),
    });
    return;
  }
  await window.beatstack!.favoriteFolders!.setActive(folderId);
}

export async function deleteFavoriteFolderById(folderId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (isManagerModeClient()) {
    const res = await fetch(`/api/manager/favorite-folders/${folderId}`, {
      method: "DELETE",
    });
    const data = (await res.json()) as { error?: string };
    return { ok: res.ok, error: data.error };
  }
  const result = await window.beatstack!.favoriteFolders!.delete(folderId);
  return { ok: result.ok, error: result.error };
}

export async function listSampleIdsInFolder(folderId?: string): Promise<string[]> {
  if (isManagerModeClient()) {
    if (!folderId) return [];
    const res = await fetch(
      `/api/samples?favoriteFolderId=${encodeURIComponent(folderId)}&limit=500`,
    );
    const data = (await res.json()) as { samples?: Array<{ id: string }> };
    return (data.samples ?? []).map((s) => s.id);
  }
  if (!window.beatstack?.favoriteFolders?.listSampleIds) return [];
  return window.beatstack.favoriteFolders.listSampleIds(folderId ?? null);
}

export async function registerSampleInActiveFolder(
  sampleId: string,
  packSlug: string,
  fileName: string,
  folderId?: string,
): Promise<void> {
  if (!window.beatstack?.favoriteFolders?.addSample) return;
  await window.beatstack.favoriteFolders.addSample({ sampleId, folderId, packSlug, fileName });
  dispatchFoldersChanged();
}

export async function unregisterSampleFromActiveFolder(
  sampleId: string,
  packSlug: string,
  fileName: string,
  folderId?: string,
): Promise<void> {
  if (!window.beatstack?.favoriteFolders?.removeSample) return;
  await window.beatstack.favoriteFolders.removeSample({ sampleId, folderId, packSlug, fileName });
  dispatchFoldersChanged();
}

export async function copySampleToActiveFavoriteFolder(
  sampleId: string,
  fileName: string,
  packSlug: string,
): Promise<{ ok: boolean; path?: string; clipboardOk?: boolean; error?: string }> {
  if (!window.beatstack?.saveSampleToFavorite) {
    return { ok: false, error: "App desktop não suporta favoritos locais" };
  }

  try {
    const res = await fetch(`/api/samples/${sampleId}/download`);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error ?? "Falha ao baixar sample" };
    }
    const buffer = await res.arrayBuffer();
    const result = await window.beatstack.saveSampleToFavorite({
      packSlug,
      fileName,
      buffer,
    });
    if (!result.ok) {
      return { ok: false, error: result.error ?? "Falha ao salvar na pasta" };
    }
    await registerSampleInActiveFolder(sampleId, packSlug, fileName);
    return {
      ok: true,
      path: result.path,
      clipboardOk: result.clipboardOk,
    };
  } catch {
    return { ok: false, error: "Erro de rede" };
  }
}

export async function removeSampleFromActiveFavoriteFolder(
  packSlug: string,
  fileName: string,
  sampleId?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!window.beatstack?.removeSampleFromFavorite) {
    return { ok: false, error: "App desktop não suporta favoritos locais" };
  }
  const result = await window.beatstack.removeSampleFromFavorite({ packSlug, fileName });
  if (result.ok) {
    await unregisterSampleFromActiveFolder(sampleId ?? "", packSlug, fileName);
  }
  return result;
}
