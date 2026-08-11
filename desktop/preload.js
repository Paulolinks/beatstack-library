const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("beatstack", {
  isDesktop: true,
  copyFile: (filePath) => ipcRenderer.invoke("clipboard:copy-file", filePath),
  copyText: (text) => ipcRenderer.invoke("clipboard:copy-text", text),
  openPath: (targetPath) => ipcRenderer.invoke("shell:open-path", targetPath),
  /** Baixa do VPS, salva em Documents/BeatStack Library e coloca na área de transferência. */
  saveSampleLocal: (payload) => ipcRenderer.invoke("samples:save-local", payload),
  saveSampleToFavorite: (payload) => ipcRenderer.invoke("samples:save-favorite", payload),
  removeSampleFromFavorite: (payload) => ipcRenderer.invoke("samples:remove-favorite", payload),
  favoriteFolders: {
    list: () => ipcRenderer.invoke("favorite-folders:list"),
    create: (name) => ipcRenderer.invoke("favorite-folders:create", name),
    setActive: (folderId) => ipcRenderer.invoke("favorite-folders:set-active", folderId),
    delete: (folderId) => ipcRenderer.invoke("favorite-folders:delete", folderId),
    addSample: (payload) => ipcRenderer.invoke("favorite-folders:add-sample", payload),
    removeSample: (payload) => ipcRenderer.invoke("favorite-folders:remove-sample", payload),
    listSampleIds: (folderId) => ipcRenderer.invoke("favorite-folders:list-sample-ids", folderId),
  },
  legal: {
    getStatus: () => ipcRenderer.invoke("legal:get-status"),
    accept: (record) => ipcRenderer.invoke("legal:accept", record),
  },
  selectDirectory: (opts) => ipcRenderer.invoke("dialog:select-directory", opts),
  storage: {
    get: () => ipcRenderer.invoke("storage:get"),
    set: (storageRoot) => ipcRenderer.invoke("storage:set", storageRoot),
  },
});
