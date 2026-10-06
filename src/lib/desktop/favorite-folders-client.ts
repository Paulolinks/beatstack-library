import { isManagerModeClient, usesCloudFavoriteFoldersClient } from "@/lib/app-mode-client";
import { dispatchFoldersChanged } from "@/lib/manager/favorite-folder-events";

export type FavoriteFolderRow = {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  diskPath?: string;
  itemCount?: number;
};

type FolderList = { folders: FavoriteFolderRow[]; activeFavoriteFolderId: string | null };

export function usesFavoriteFolders(): boolean {
  return isManagerModeClient() || usesCloudFavoriteFoldersClient();
}

function folderApiBase(): string {
  return isManagerModeClient() ? "/api/manager/favorite-folders" : "/api/folders";
}

/** Pasta local (Documentos/BeatStack Library/Favoritos) onde o app desktop guarda a cópia. */
async function localFavoritesRoot(): Promise<string | null> {
  const local = window.beatstack?.favoriteFolders;
  if (!local) return null;
  try {
    const data = await local.list();
    return data.folders?.find((f) => f.isDefault)?.diskPath ?? null;
  } catch {
    return null;
  }
}

function localDiskPath(root: string, folder: FavoriteFolderRow): string {
  if (folder.isDefault) return root;
  const sep = root.includes("\\") ? "\\" : "/";
  return `${root.replace(/[\\/]+$/, "")}${sep}${folder.slug.replace(/[<>:"/\\|?*]/g, "_")}`;
}

export async function listFavoriteFolders(): Promise<FolderList> {
  if (!usesFavoriteFolders()) throw new Error("Pastas favoritas indisponíveis");
  const res = await fetch(folderApiBase(), { cache: "no-store" });
  const data = (await res.json()) as Partial<FolderList> & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Erro ao carregar pastas");

  let folders = data.folders ?? [];
  if (usesCloudFavoriteFoldersClient()) {
    const root = await localFavoritesRoot();
    if (root) folders = folders.map((f) => ({ ...f, diskPath: localDiskPath(root, f) }));
  }
  return { folders, activeFavoriteFolderId: data.activeFavoriteFolderId ?? null };
}

export async function createFavoriteFolder(name: string): Promise<{
  ok: boolean;
  error?: string;
  status?: number;
}> {
  const res = await fetch(folderApiBase(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = (await res.json()) as { error?: string };
  return { ok: res.ok, error: data.error, status: res.status };
}

export async function setActiveFavoriteFolder(folderId: string | null): Promise<void> {
  await fetch(folderApiBase(), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activeFavoriteFolderId: folderId }),
  });
}

export async function deleteFavoriteFolderById(folderId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const res = await fetch(`${folderApiBase()}/${folderId}`, { method: "DELETE" });
  const data = (await res.json()) as { error?: string };
  return { ok: res.ok, error: data.error };
}

export async function listSampleIdsInFolder(folderId?: string): Promise<string[]> {
  if (!folderId) return [];
  if (isManagerModeClient()) {
    const res = await fetch(
      `/api/samples?favoriteFolderId=${encodeURIComponent(folderId)}&limit=500`,
    );
    const data = (await res.json()) as { samples?: Array<{ id: string }> };
    return (data.samples ?? []).map((s) => s.id);
  }
  const res = await fetch(`/api/folders/${encodeURIComponent(folderId)}/sample-ids`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { sampleIds?: string[] };
  return data.sampleIds ?? [];
}

async function resolveActiveFolder(): Promise<FavoriteFolderRow | null> {
  const { folders, activeFavoriteFolderId } = await listFavoriteFolders();
  return (
    folders.find((f) => f.id === activeFavoriteFolderId) ??
    folders.find((f) => f.isDefault) ??
    folders[0] ??
    null
  );
}

async function saveLocalCopy(folder: FavoriteFolderRow, sampleId: string, fileName: string, packSlug: string) {
  if (!window.beatstack?.saveSampleToFavorite) return null;
  const res = await fetch(`/api/samples/${sampleId}/download`);
  if (!res.ok) return null;
  return window.beatstack.saveSampleToFavorite({
    packSlug,
    fileName,
    buffer: await res.arrayBuffer(),
    folderSlug: folder.slug,
  });
}

/**
 * Coração no Library: salva o sample na pasta ativa no VPS (aparece em qualquer
 * computador e não some quando o pack é excluído). No app desktop também copia
 * para Documentos/BeatStack Library/Favoritos/<pasta>.
 */
export async function copySampleToActiveFavoriteFolder(
  sampleId: string,
  fileName: string,
  packSlug: string,
): Promise<{ ok: boolean; path?: string; clipboardOk?: boolean; error?: string }> {
  try {
    const folder = await resolveActiveFolder();
    if (!folder) return { ok: false, error: "Nenhuma pasta de favoritos" };

    const res = await fetch(`/api/folders/${folder.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sampleId }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? "Falha ao salvar na pasta" };

    const local = await saveLocalCopy(folder, sampleId, fileName, packSlug).catch(() => null);
    dispatchFoldersChanged();
    return { ok: true, path: local?.path, clipboardOk: local?.clipboardOk };
  } catch {
    return { ok: false, error: "Erro de rede" };
  }
}

export async function removeSampleFromActiveFavoriteFolder(
  packSlug: string,
  fileName: string,
  sampleId?: string,
  options?: { folderId?: string; folderItemId?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const folders = await listFavoriteFolders();
    const folder =
      folders.folders.find((f) => f.id === (options?.folderId ?? folders.activeFavoriteFolderId)) ??
      folders.folders.find((f) => f.isDefault);
    if (!folder) return { ok: false, error: "Nenhuma pasta de favoritos" };

    const query = options?.folderItemId
      ? `itemId=${encodeURIComponent(options.folderItemId)}`
      : `sampleId=${encodeURIComponent(sampleId ?? "")}`;
    const res = await fetch(`/api/folders/${folder.id}/items?${query}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? "Falha ao remover da pasta" };

    await window.beatstack
      ?.removeSampleFromFavorite?.({ packSlug, fileName, folderSlug: folder.slug })
      .catch(() => undefined);
    dispatchFoldersChanged();
    return { ok: true };
  } catch {
    return { ok: false, error: "Erro de rede" };
  }
}

const LOCAL_MIGRATION_KEY = "beatstack:cloud-folders-migrated";

/** Uma vez por computador: leva as pastas que estavam só no app desktop para o VPS. */
export async function migrateLocalFoldersToCloud(): Promise<boolean> {
  if (!usesCloudFavoriteFoldersClient()) return false;
  const local = window.beatstack?.favoriteFolders;
  if (!local?.list || !local.listSampleIds) return false;
  if (window.localStorage.getItem(LOCAL_MIGRATION_KEY)) return false;

  try {
    const data = await local.list();
    const payload = [];
    for (const folder of data.folders ?? []) {
      const sampleIds = await local.listSampleIds(folder.id);
      if (sampleIds.length === 0 && folder.isDefault) continue;
      payload.push({ name: folder.name, isDefault: folder.isDefault, sampleIds });
    }
    if (payload.length > 0) {
      const res = await fetch("/api/folders/import-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folders: payload }),
      });
      if (!res.ok) return false;
    }
    window.localStorage.setItem(LOCAL_MIGRATION_KEY, new Date().toISOString());
    return payload.length > 0;
  } catch {
    return false;
  }
}
