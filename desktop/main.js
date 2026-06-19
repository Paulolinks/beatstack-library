const { app, BrowserWindow, shell, ipcMain, clipboard } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { copyFileToClipboardWin } = require("./clipboard-win");
const { saveSampleLocal } = require("./save-sample-local");

const PORT = process.env.PORT || "3000";
const LOCAL_URL = `http://127.0.0.1:${PORT}`;

let serverUrlCache = null;

function readServerUrlFromConfig() {
  try {
    const configPath = path.join(app.getPath("userData"), "server.json");
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, "utf-8");
    const cfg = JSON.parse(raw);
    if (typeof cfg.serverUrl === "string" && cfg.serverUrl.trim()) {
      return cfg.serverUrl.trim().replace(/\/$/, "");
    }
  } catch {
    /* ignore */
  }
  return null;
}

function resolveServerUrl() {
  const fromEnv = process.env.BEATSTACK_SERVER_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const fromFile = readServerUrlFromConfig();
  if (fromFile) return fromFile;
  return LOCAL_URL;
}

function getServerUrl() {
  if (!serverUrlCache) serverUrlCache = resolveServerUrl();
  return serverUrlCache;
}

function isRemoteServerUrl(url) {
  return !url.includes("127.0.0.1") && !url.includes("localhost");
}

let mainWindow = null;
let serverProcess = null;

ipcMain.handle("clipboard:copy-file", (_event, filePath) => {
  return copyFileToClipboardWin(filePath);
});

ipcMain.handle("clipboard:copy-text", (_event, text) => {
  try {
    clipboard.writeText(text ?? "");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle("samples:save-local", (_event, payload) => {
  return saveSampleLocal(payload);
});

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.get(url, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function isServerUp(url) {
  return httpGet(url).then((code) => code >= 200 && code < 500).catch(() => false);
}

function startServer() {
  if (isRemoteServerUrl(getServerUrl())) return;

  const root = path.join(__dirname, "..");
  const isDev = !app.isPackaged;

  if (isDev) {
    serverProcess = spawn("npm", ["run", "dev", "--", "-p", PORT], {
      cwd: root,
      shell: true,
      stdio: "inherit",
      env: { ...process.env, PORT, BEATSTACK_DESKTOP: "1" },
    });
    return;
  }

  const standaloneDir = path.join(process.resourcesPath, "standalone");
  serverProcess = spawn("node", ["server.js"], {
    cwd: standaloneDir,
    shell: true,
    stdio: "inherit",
    env: {
      ...process.env,
      PORT,
      HOSTNAME: "127.0.0.1",
      BEATSTACK_DESKTOP: "1",
    },
  });
}

function waitForServer(retries = 90) {
  const serverUrl = getServerUrl();
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tick = async () => {
      attempts += 1;
      const up = await isServerUp(serverUrl);
      if (up) {
        resolve();
        return;
      }
      if (attempts >= retries) {
        reject(new Error(`Servidor não respondeu: ${serverUrl}`));
        return;
      }
      setTimeout(tick, 500);
    };

    tick();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "BeatStack Library",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL(`${getServerUrl()}/login`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  const serverUrl = getServerUrl();
  const remote = isRemoteServerUrl(serverUrl);

  if (remote) {
    console.log(`[BeatStack] Modo cliente remoto → ${serverUrl}`);
  } else {
    const alreadyRunning = await isServerUp(LOCAL_URL);
    if (!alreadyRunning) {
      startServer();
    }
  }

  try {
    await waitForServer();
    createWindow();
  } catch (err) {
    console.error(err);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
