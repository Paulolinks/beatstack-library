import fs from "fs";
import os from "os";
import path from "path";
import { getProductFolderName, isManagerMode } from "@/lib/app-mode";

export type LibraryFolder = "downloads" | "likes" | "copied" | "presets" | "favoritos";

const LIBRARY_FOLDER_NAMES: Record<Exclude<LibraryFolder, "favoritos">, string> = {
  downloads: "Downloads",
  likes: "Likes",
  copied: "Copied",
  presets: "Presets",
};

/** Raiz: Documents/BeatStack Library ou Documents/BeatStack Manager */
export function getLibraryRoot(): string {
  const documents =
    process.env.USERPROFILE != null
      ? path.join(process.env.USERPROFILE, "Documents")
      : path.join(os.homedir(), "Documents");
  return path.join(documents, getProductFolderName());
}

export function getFavoritosRoot(): string {
  return path.join(getLibraryRoot(), "Favoritos");
}

/** Pasta física de favoritos — default ou subpasta custom (Aliens, Hip-hop, …). */
export function getFavoriteFolderPath(folderSlug?: string | null): string {
  const root = getFavoritosRoot();
  if (!folderSlug || folderSlug === "default") {
    return root;
  }
  return path.join(root, sanitizePathSegment(folderSlug));
}

export function getLibraryFolder(folder: LibraryFolder): string {
  if (folder === "favoritos") {
    return getFavoritosRoot();
  }
  return path.join(getLibraryRoot(), LIBRARY_FOLDER_NAMES[folder]);
}

function mkdirIfMissing(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function ensureLibraryRoot(): string {
  const root = getLibraryRoot();
  mkdirIfMissing(root);

  const folders: LibraryFolder[] = isManagerMode()
    ? ["favoritos", "downloads", "copied", "presets"]
    : (Object.keys(LIBRARY_FOLDER_NAMES) as Array<keyof typeof LIBRARY_FOLDER_NAMES>);

  for (const folder of folders) {
    mkdirIfMissing(getLibraryFolder(folder));
  }

  return root;
}

export function ensureLibraryFolder(folder: LibraryFolder): string {
  mkdirIfMissing(getLibraryRoot());
  const dir = getLibraryFolder(folder);
  mkdirIfMissing(dir);
  return dir;
}

export function ensureFavoriteFolderPath(folderSlug?: string | null): string {
  ensureLibraryFolder("favoritos");
  const dir = getFavoriteFolderPath(folderSlug);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function sanitizePathSegment(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "pack";
}

export function getLibraryPathsInfo() {
  ensureLibraryRoot();
  const base = {
    root: getLibraryRoot(),
    favoritos: getFavoritosRoot(),
    downloads: getLibraryFolder("downloads"),
    copied: getLibraryFolder("copied"),
    presets: getLibraryFolder("presets"),
  };
  if (isManagerMode()) {
    return { ...base, likes: getFavoritosRoot() };
  }
  return {
    ...base,
    likes: getLibraryFolder("likes"),
  };
}

/** Copia sample para pasta de favoritos (Manager) — arquivos na raiz da pasta para uso no DAW. */
export function copySampleToFavoriteDisk(
  sourcePath: string,
  packSlug: string,
  fileName: string,
  favoriteFolderSlug?: string | null,
): string {
  const libraryDir = ensureFavoriteFolderPath(favoriteFolderSlug);
  const safeName = fileName.replace(/[<>:"/\\|?*]/g, "_");
  let destPath = path.join(libraryDir, safeName);
  if (fs.existsSync(destPath)) {
    const prefix = sanitizePathSegment(packSlug);
    destPath = path.join(libraryDir, `${prefix}__${safeName}`);
  }
  fs.copyFileSync(sourcePath, destPath);
  return destPath;
}

function favoriteDiskCandidates(
  packSlug: string,
  fileName: string,
  folderSlug?: string | null,
): string[] {
  const libraryDir = getFavoriteFolderPath(folderSlug);
  const safeName = fileName.replace(/[<>:"/\\|?*]/g, "_");
  const prefix = sanitizePathSegment(packSlug);
  return [
    path.join(libraryDir, safeName),
    path.join(libraryDir, `${prefix}__${safeName}`),
    path.join(libraryDir, prefix, safeName),
  ];
}

export function removeSampleFromFavoriteDisk(
  packSlug: string,
  fileName: string,
  folderSlug?: string | null,
): void {
  for (const destPath of favoriteDiskCandidates(packSlug, fileName, folderSlug)) {
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
  }
}
