const fs = require("fs");
const {
  buildLocalSamplePath,
  buildFavoriteSamplePath,
  removeFavoriteSampleFromDisk,
} = require("./library-paths");
const { copyFileToClipboardWin } = require("./clipboard-win");

function saveSampleLocal({ folder, packSlug, fileName, buffer }) {
  try {
    const destPath = buildLocalSamplePath(folder || "downloads", packSlug || "pack", fileName);
    fs.writeFileSync(destPath, Buffer.from(buffer));

    const clip = copyFileToClipboardWin(destPath);
    return { ok: true, path: destPath, clipboardOk: clip.ok, ...clip };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function saveSampleToFavorite({ packSlug, fileName, buffer, folderSlug }) {
  try {
    const destPath = buildFavoriteSamplePath(folderSlug ?? null, packSlug || "pack", fileName);
    fs.writeFileSync(destPath, Buffer.from(buffer));
    const clip = copyFileToClipboardWin(destPath);
    return { ok: true, path: destPath, clipboardOk: clip.ok, ...clip };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function removeSampleFromFavorite({ packSlug, fileName, folderSlug }) {
  try {
    removeFavoriteSampleFromDisk(folderSlug ?? null, packSlug || "pack", fileName);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

module.exports = { saveSampleLocal, saveSampleToFavorite, removeSampleFromFavorite };
