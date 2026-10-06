import { useCallback, useEffect, useState } from "react";
import {
  FOLDERS_CHANGED_EVENT,
  readFoldersChangedDetail,
} from "@/lib/manager/favorite-folder-events";
import { usesFavoriteFoldersClient } from "@/lib/app-mode-client";
import { listFavoriteFolders } from "@/lib/desktop/favorite-folders-client";

export function useActiveFavoriteFolderId(): string | null {
  const [folderId, setFolderId] = useState<string | null>(null);
  const enabled = usesFavoriteFoldersClient();

  const load = useCallback(async () => {
    if (!enabled) {
      setFolderId(null);
      return;
    }
    try {
      const data = await listFavoriteFolders();
      const active =
        data.activeFavoriteFolderId ??
        data.folders.find((f) => f.isDefault)?.id ??
        data.folders[0]?.id ??
        null;
      setFolderId(active);
    } catch {
      /* ignore */
    }
  }, [enabled]);

  useEffect(() => {
    void load();
    const onChange = (event: Event) => {
      const detail = readFoldersChangedDetail(event);
      if (detail.activeFavoriteFolderId !== undefined) {
        setFolderId(detail.activeFavoriteFolderId);
      }
      void load();
    };
    window.addEventListener(FOLDERS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(FOLDERS_CHANGED_EVENT, onChange);
  }, [load]);

  return folderId;
}
