const fs = require("fs");
const os = require("os");
const path = require("path");

function isManagerMode() {
  return process.env.BEATSTACK_APP_MODE === "manager";
}

const FOLDER_NAMES = {
  downloads: "Downloads",
  likes: "Likes",
  copied: "Copied",
  favoritos: "Favoritos",
};

function getProductFolderName() {
  return isManagerMode() ? "BeatStack Manager" : "BeatStack Library";
}

function getLibraryRoot() {
  const documents =
    process.env.USERPROFILE != null
      ? path.join(process.env.USERPROFILE, "Documents")
      : path.join(os.homedir(), "Documents");
  return path.join(documents, getProductFolderName());
}

function getFavoritosRoot() {
  return path.join(getLibraryRoot(), FOLDER_NAMES.favoritos);
}

function getFavoriteFolderPath(folderSlug) {
  const root = getFavoritosRoot();
  if (!folderSlug || folderSlug === "default") {
    return root;
  }
  return path.join(root, sanitizePathSegment(folderSlug));
}

function ensureFavoriteFolderPath(folderSlug) {
  const dir = getFavoriteFolderPath(folderSlug);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function buildFavoriteSamplePath(folderSlug, packSlug, fileName) {
  const libraryDir = ensureFavoriteFolderPath(folderSlug);
  const safeName = String(fileName).replace(/[<>:"/\\|?*]/g, "_");
  let destPath = path.join(libraryDir, safeName);
  if (fs.existsSync(destPath)) {
    const prefix = sanitizePathSegment(packSlug);
    destPath = path.join(libraryDir, `${prefix}__${safeName}`);
  }
  return destPath;
}

function removeFavoriteSampleFromDisk(folderSlug, packSlug, fileName) {
  const libraryDir = getFavoriteFolderPath(folderSlug);
  const safeName = String(fileName).replace(/[<>:"/\\|?*]/g, "_");
  const prefix = sanitizePathSegment(packSlug);
  const candidates = [
    path.join(libraryDir, safeName),
    path.join(libraryDir, `${prefix}__${safeName}`),
    path.join(libraryDir, prefix, safeName),
  ];
  for (const destPath of candidates) {
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
  }
}

function getLibraryFolder(folder) {
  if (folder === "favoritos" || (isManagerMode() && folder === "likes")) {
    return getFavoritosRoot();
  }
  return path.join(getLibraryRoot(), FOLDER_NAMES[folder] || FOLDER_NAMES.downloads);
}

function ensureLibraryFolder(folder) {
  const dir = getLibraryFolder(folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sanitizePathSegment(name) {
  return String(name).replace(/[<>:"/\\|?*]/g, "_").trim() || "pack";
}

function buildLocalSamplePath(folder, packSlug, fileName) {
  const packDir = path.join(ensureLibraryFolder(folder), sanitizePathSegment(packSlug));
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir, { recursive: true });
  }
  const safeName = String(fileName).replace(/[<>:"/\\|?*]/g, "_");
  return path.join(packDir, safeName);
}

module.exports = {
  getLibraryRoot,
  getLibraryFolder,
  getFavoritosRoot,
  getFavoriteFolderPath,
  ensureFavoriteFolderPath,
  ensureLibraryFolder,
  sanitizePathSegment,
  buildLocalSamplePath,
  buildFavoriteSamplePath,
  removeFavoriteSampleFromDisk,
  getProductFolderName,
};
