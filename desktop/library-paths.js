const fs = require("fs");
const os = require("os");
const path = require("path");

const FOLDER_NAMES = {
  downloads: "Downloads",
  likes: "Likes",
  copied: "Copied",
};

function getLibraryRoot() {
  const documents =
    process.env.USERPROFILE != null
      ? path.join(process.env.USERPROFILE, "Documents")
      : path.join(os.homedir(), "Documents");
  return path.join(documents, "BeatStack Library");
}

function getLibraryFolder(folder) {
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
  ensureLibraryFolder,
  sanitizePathSegment,
  buildLocalSamplePath,
};
