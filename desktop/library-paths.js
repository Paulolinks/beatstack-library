import fs from "fs";
import os from "os";
import path from "path";

export type LibraryFolder = "downloads" | "likes" | "copied";

const FOLDER_NAMES: Record<LibraryFolder, string> = {
  downloads: "Downloads",
  likes: "Likes",
  copied: "Copied",
};

export function getLibraryRoot(): string {
  const documents =
    process.env.USERPROFILE != null
      ? path.join(process.env.USERPROFILE, "Documents")
      : path.join(os.homedir(), "Documents");
  return path.join(documents, "BeatStack Library");
}

export function getLibraryFolder(folder: LibraryFolder): string {
  return path.join(getLibraryRoot(), FOLDER_NAMES[folder]);
}

export function ensureLibraryFolder(folder: LibraryFolder): string {
  const dir = getLibraryFolder(folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function sanitizePathSegment(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "pack";
}

export function buildLocalSamplePath(
  folder: LibraryFolder,
  packSlug: string,
  fileName: string,
): string {
  const packDir = path.join(ensureLibraryFolder(folder), sanitizePathSegment(packSlug));
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir, { recursive: true });
  }
  const safeName = fileName.replace(/[<>:"/\\|?*]/g, "_");
  return path.join(packDir, safeName);
}
