"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import {
  listFavoriteFolders,
  usesFavoriteFolders,
  type FavoriteFolderRow,
} from "@/lib/desktop/favorite-folders-client";
import { isManagerModeClient } from "@/lib/app-mode-client";

interface FavoriteFolderHeaderProps {
  folderId?: string;
}

export function FavoriteFolderHeader({ folderId }: FavoriteFolderHeaderProps) {
  const { t } = useI18n();
  const [folder, setFolder] = useState<FavoriteFolderRow | null>(null);

  const load = useCallback(async () => {
    if (!usesFavoriteFolders()) return;
    try {
      const data = await listFavoriteFolders();
      const folders = data.folders;
      const match = folderId
        ? folders.find((f) => f.id === folderId)
        : folders.find((f) => f.isDefault);
      setFolder(match ?? null);
    } catch {
      setFolder(null);
    }
  }, [folderId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!folder) return null;

  async function openInExplorer() {
    if (!folder?.diskPath) return;
    if (window.beatstack?.openPath) {
      await window.beatstack.openPath(folder.diskPath);
      return;
    }
    await window.beatstack?.copyText?.(folder.diskPath);
  }

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">{folder.name}</h1>
      {!isManagerModeClient() && (
        <p className="mt-1 text-xs text-zinc-500">
          Pasta salva no VPS — aparece igual em qualquer computador e os samples continuam aqui
          mesmo se o pack for excluído.
        </p>
      )}
      {folder.diskPath && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="font-mono break-all">{folder.diskPath}</span>
          <button
            type="button"
            onClick={() => void openInExplorer()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {t("openFolder")}
          </button>
        </div>
      )}
    </div>
  );
}
