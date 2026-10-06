export const FOLDERS_CHANGED_EVENT = "beatstack:folders-changed";

export type FoldersChangedDetail = {
  /** Pasta ativa para favoritar — atualiza UI na hora, sem esperar refetch. */
  activeFavoriteFolderId?: string | null;
};

export function dispatchFoldersChanged(detail?: FoldersChangedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FOLDERS_CHANGED_EVENT, { detail: detail ?? {} }));
}

export function readFoldersChangedDetail(event: Event): FoldersChangedDetail {
  return (event as CustomEvent<FoldersChangedDetail>).detail ?? {};
}
