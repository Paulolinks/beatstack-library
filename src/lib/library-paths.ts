import fs from "fs";
import os from "os";
import path from "path";

export type LibraryFolder = "downloads" | "likes" | "copied" | "presets";

const FOLDER_NAMES: Record<LibraryFolder, string> = {
  downloads: "Downloads",
  likes: "Likes",
  copied: "Copied",
  presets: "Presets",
};

/** Raiz estilo Splice: Documents/BeatStack Library */
export function getLibraryRoot(): string {
  const documents =
    process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, "Documents")
      : path.join(os.homedir(), "Documents");
  return path.join(documents, "BeatStack Library");
}

export function getLibraryFolder(folder: LibraryFolder): string {
  return path.join(getLibraryRoot(), FOLDER_NAMES[folder]);
}

export function ensureLibraryRoot(): string {
  const root = getLibraryRoot();
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  for (const key of Object.keys(FOLDER_NAMES) as LibraryFolder[]) {
    const dir = getLibraryFolder(key);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  return root;
}

export function ensureLibraryFolder(folder: LibraryFolder): string {
  ensureLibraryRoot();
  const dir = getLibraryFolder(folder);
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
  return {
    root: getLibraryRoot(),
    downloads: getLibraryFolder("downloads"),
    likes: getLibraryFolder("likes"),
    copied: getLibraryFolder("copied"),
    presets: getLibraryFolder("presets"),
  };
}
