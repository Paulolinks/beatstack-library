import { ensureLibraryFolder, getLibraryFolder } from "@/lib/library-paths";

/** @deprecated Use library-paths — mantido para compatibilidade */
export function getStagingDir(): string {
  return getLibraryFolder("downloads");
}

export function ensureStagingDir(): string {
  return ensureLibraryFolder("downloads");
}
