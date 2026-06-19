const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("beatstack", {
  isDesktop: true,
  copyFile: (filePath) => ipcRenderer.invoke("clipboard:copy-file", filePath),
  copyText: (text) => ipcRenderer.invoke("clipboard:copy-text", text),
  /** Baixa do VPS, salva em Documents/BeatStack Library e coloca na área de transferência. */
  saveSampleLocal: (payload) => ipcRenderer.invoke("samples:save-local", payload),
});
