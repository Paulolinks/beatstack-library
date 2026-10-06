"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FolderPlus, FolderOpen, Check, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import {
  createFavoriteFolder,
  deleteFavoriteFolderById,
  listFavoriteFolders,
  migrateLocalFoldersToCloud,
  setActiveFavoriteFolder,
  usesFavoriteFolders,
  type FavoriteFolderRow,
} from "@/lib/desktop/favorite-folders-client";
import {
  dispatchFoldersChanged,
  FOLDERS_CHANGED_EVENT,
} from "@/lib/manager/favorite-folder-events";

export { FOLDERS_CHANGED_EVENT };

export function FavoriteFolderCreateForm() {
  const { t } = useI18n();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!usesFavoriteFolders()) return null;

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createFavoriteFolder(newName.trim());
      if (result.status === 409) {
        setError(t("folderExists"));
        dispatchFoldersChanged();
        return;
      }
      if (!result.ok) {
        setError(result.error ?? t("internalError"));
        return;
      }
      setNewName("");
      dispatchFoldersChanged();
    } catch {
      setError(t("networkError"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="border-t border-white/10 px-2 py-2">
      {error && <p className="mb-2 px-1 text-xs text-rose-400">{error}</p>}
      <form onSubmit={(e) => void createFolder(e)} className="flex gap-1">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("newFolderPlaceholder")}
          disabled={creating}
          autoComplete="off"
          className="relative z-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#141418] px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          title={t("createFolder")}
          className="relative z-10 shrink-0 rounded-lg bg-white/10 p-1.5 text-zinc-300 hover:bg-white/15 disabled:opacity-40"
        >
          <FolderPlus className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export function FavoriteFoldersPanel() {
  const { t } = useI18n();
  const [folders, setFolders] = useState<FavoriteFolderRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabled = usesFavoriteFolders();

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listFavoriteFolders();
      setFolders(data.folders);
      setActiveId(data.activeFavoriteFolderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("internalError"));
    } finally {
      setLoading(false);
    }
  }, [enabled, t]);

  useEffect(() => {
    if (!enabled) return;
    void migrateLocalFoldersToCloud().then((imported) => {
      if (imported) dispatchFoldersChanged();
    });
  }, [enabled]);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener(FOLDERS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(FOLDERS_CHANGED_EVENT, onChange);
  }, [load]);

  async function setActive(folderId: string | null) {
    await setActiveFavoriteFolder(folderId);
    setActiveId(folderId);
    const resolvedId = folderId ?? folders.find((f) => f.isDefault)?.id ?? null;
    dispatchFoldersChanged({ activeFavoriteFolderId: resolvedId });
  }

  async function deleteFolder(folder: FavoriteFolderRow) {
    if (folder.isDefault) return;
    const msg = t("confirmDeleteFolder").replace("{name}", folder.name);
    if (!window.confirm(msg)) return;

    setDeletingId(folder.id);
    setError(null);
    try {
      const result = await deleteFavoriteFolderById(folder.id);
      if (!result.ok) {
        setError(result.error ?? t("internalError"));
        return;
      }
      await load();
      dispatchFoldersChanged();
    } catch {
      setError(t("networkError"));
    } finally {
      setDeletingId(null);
    }
  }

  if (!enabled) return null;

  const activeFolder = folders.find((f) => f.id === activeId) ?? folders.find((f) => f.isDefault);

  return (
    <div className="mt-6 border-t border-white/10 px-2 pt-4">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        {t("favoriteFolders")}
      </p>
      <p className="mb-3 px-2 text-[11px] leading-snug text-zinc-600">
        {t("activeFolder")}:{" "}
        <span className="text-zinc-400">{activeFolder?.name ?? t("defaultFavorites")}</span>
        <br />
        {t("heartCopiesHere")}
      </p>

      {error && <p className="mb-2 px-2 text-xs text-rose-400">{error}</p>}

      {loading ? (
        <p className="px-2 text-xs text-zinc-600">{t("loading")}</p>
      ) : (
        <ul className="mb-1 max-h-40 space-y-0.5 overflow-y-auto">
          {folders.map((folder) => {
            const isActive = activeId ? folder.id === activeId : folder.isDefault;
            return (
              <li key={folder.id} className="group flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => void setActive(folder.isDefault ? null : folder.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-sky-600/20 text-sky-300"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                  )}
                >
                  {isActive ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </button>
                <Link
                  href={
                    folder.isDefault
                      ? "/collections/favoritos"
                      : `/collections/favoritos?folderId=${folder.id}`
                  }
                  title={t("openFolder")}
                  className="rounded p-1.5 text-zinc-600 opacity-0 transition hover:bg-white/5 hover:text-zinc-300 group-hover:opacity-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                {!folder.isDefault && (
                  <button
                    type="button"
                    title={t("deleteFolder")}
                    disabled={deletingId === folder.id}
                    onClick={() => void deleteFolder(folder)}
                    className="rounded p-1.5 text-zinc-600 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
