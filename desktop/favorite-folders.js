const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getFavoriteFolderPath, ensureFavoriteFolderPath } = require("./library-paths");

const DEFAULT_FOLDER = {
  id: "default",
  name: "Favoritos",
  slug: "default",
  isDefault: true,
};

function configPath(userDataDir) {
  return path.join(userDataDir, "library-favorite-folders.json");
}

function slugifyFolderName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "pasta";
}

function loadState(userDataDir) {
  const file = configPath(userDataDir);
  if (!fs.existsSync(file)) {
    ensureFavoriteFolderPath(null);
    return { folders: [{ ...DEFAULT_FOLDER }], activeFavoriteFolderId: null };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const folders = Array.isArray(raw.folders) && raw.folders.length > 0
      ? raw.folders
      : [{ ...DEFAULT_FOLDER }];
    if (!folders.some((f) => f.isDefault)) {
      folders.unshift({ ...DEFAULT_FOLDER });
    }
    return {
      folders,
      activeFavoriteFolderId: raw.activeFavoriteFolderId ?? null,
    };
  } catch {
    return { folders: [{ ...DEFAULT_FOLDER }], activeFavoriteFolderId: null };
  }
}

function saveState(userDataDir, state) {
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(configPath(userDataDir), JSON.stringify(state, null, 2), "utf8");
}

function withDiskPaths(folders) {
  return folders.map((f) => ({
    ...f,
    diskPath: getFavoriteFolderPath(f.isDefault ? null : f.slug),
  }));
}

function listFavoriteFolders(userDataDir) {
  const state = loadState(userDataDir);
  return {
    folders: withDiskPaths(state.folders),
    activeFavoriteFolderId: state.activeFavoriteFolderId,
  };
}

function createFavoriteFolder(userDataDir, name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return { ok: false, error: "Nome da pasta obrigatório" };
  }

  const state = loadState(userDataDir);
  const exists = state.folders.find(
    (f) => f.name.localeCompare(trimmed, undefined, { sensitivity: "accent" }) === 0,
  );
  if (exists) {
    return { ok: false, status: 409, error: "Já existe uma pasta com este nome", folder: exists };
  }

  let slug = slugifyFolderName(trimmed);
  if (state.folders.some((f) => f.slug === slug)) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const folder = {
    id: crypto.randomUUID(),
    name: trimmed,
    slug,
    isDefault: false,
  };

  try {
    ensureFavoriteFolderPath(folder.slug);
  } catch (err) {
    console.error("[favorite-folders] disk:", err);
  }

  state.folders.push(folder);
  saveState(userDataDir, state);

  return {
    ok: true,
    folder: { ...folder, diskPath: getFavoriteFolderPath(folder.slug) },
  };
}

function setActiveFavoriteFolder(userDataDir, folderId) {
  const state = loadState(userDataDir);
  if (folderId) {
    const folder = state.folders.find((f) => f.id === folderId);
    if (!folder) {
      return { ok: false, error: "Pasta não encontrada" };
    }
  }
  state.activeFavoriteFolderId = folderId;
  saveState(userDataDir, state);
  return { ok: true, activeFavoriteFolderId: folderId };
}

function deleteFavoriteFolder(userDataDir, folderId) {
  const state = loadState(userDataDir);
  const folder = state.folders.find((f) => f.id === folderId);
  if (!folder) {
    return { ok: false, error: "Pasta não encontrada" };
  }
  if (folder.isDefault) {
    return { ok: false, error: "Não é possível excluir a pasta padrão" };
  }

  state.folders = state.folders.filter((f) => f.id !== folderId);
  if (state.activeFavoriteFolderId === folderId) {
    state.activeFavoriteFolderId = null;
  }
  saveState(userDataDir, state);
  deleteFolderSamples(userDataDir, folderId);
  return { ok: true };
}

function getActiveFolderSlug(userDataDir) {
  const state = loadState(userDataDir);
  const activeId = state.activeFavoriteFolderId;
  const folder = activeId
    ? state.folders.find((f) => f.id === activeId)
    : state.folders.find((f) => f.isDefault);
  if (!folder || folder.isDefault) return null;
  return folder.slug;
}

function getActiveFolderId(userDataDir) {
  const state = loadState(userDataDir);
  if (state.activeFavoriteFolderId) {
    return state.activeFavoriteFolderId;
  }
  return state.folders.find((f) => f.isDefault)?.id ?? "default";
}

function samplesIndexPath(userDataDir) {
  return path.join(userDataDir, "library-favorite-samples.json");
}

function loadSampleIndex(userDataDir) {
  const file = samplesIndexPath(userDataDir);
  if (!fs.existsSync(file)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveSampleIndex(userDataDir, entries) {
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(samplesIndexPath(userDataDir), JSON.stringify(entries, null, 2), "utf8");
}

function addSampleToFolder(userDataDir, { sampleId, folderId, packSlug, fileName }) {
  if (!sampleId) return { ok: false, error: "sampleId obrigatório" };
  const resolvedFolderId = folderId || getActiveFolderId(userDataDir);
  const entries = loadSampleIndex(userDataDir).filter(
    (e) => !(e.sampleId === sampleId && e.folderId === resolvedFolderId),
  );
  entries.push({
    sampleId,
    folderId: resolvedFolderId,
    packSlug: packSlug || "pack",
    fileName: fileName || "sample.wav",
    addedAt: new Date().toISOString(),
  });
  saveSampleIndex(userDataDir, entries);
  return { ok: true, folderId: resolvedFolderId };
}

function removeSampleFromFolder(userDataDir, { sampleId, folderId, packSlug, fileName }) {
  const resolvedFolderId = folderId || getActiveFolderId(userDataDir);
  let entries = loadSampleIndex(userDataDir);
  if (sampleId) {
    entries = entries.filter(
      (e) => !(e.sampleId === sampleId && e.folderId === resolvedFolderId),
    );
  } else if (packSlug && fileName) {
    entries = entries.filter(
      (e) =>
        !(
          e.folderId === resolvedFolderId &&
          e.packSlug === packSlug &&
          e.fileName === fileName
        ),
    );
  }
  saveSampleIndex(userDataDir, entries);
  return { ok: true };
}

function listSampleIdsInFolder(userDataDir, folderId) {
  const resolved = folderId || getActiveFolderId(userDataDir);
  return loadSampleIndex(userDataDir)
    .filter((e) => e.folderId === resolved)
    .map((e) => e.sampleId);
}

function deleteFolderSamples(userDataDir, folderId) {
  const entries = loadSampleIndex(userDataDir).filter((e) => e.folderId !== folderId);
  saveSampleIndex(userDataDir, entries);
}

module.exports = {
  listFavoriteFolders,
  createFavoriteFolder,
  setActiveFavoriteFolder,
  deleteFavoriteFolder,
  getActiveFolderSlug,
  getActiveFolderId,
  addSampleToFolder,
  removeSampleFromFolder,
  listSampleIdsInFolder,
};
