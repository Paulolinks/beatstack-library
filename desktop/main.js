const fs = require("fs");
const path = require("path");

function bootLog(message) {
  try {
    const logPath = path.join(process.env.APPDATA || "", "beatstack-manager", "boot.log");
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  } catch {
    /* ignore */
  }
}

function getResourcesPath() {
  if (process.resourcesPath) return process.resourcesPath;
  return path.join(path.dirname(process.execPath), "resources");
}

function readManagerModeFromBundle() {
  try {
    return fs.existsSync(path.join(getResourcesPath(), "manager-mode.json"));
  } catch {
    return false;
  }
}

function ensureManagerEnv() {
  if (readManagerModeFromBundle()) {
    process.env.BEATSTACK_APP_MODE = process.env.BEATSTACK_APP_MODE || "manager";
    process.env.NEXT_PUBLIC_BEATSTACK_APP_MODE =
      process.env.NEXT_PUBLIC_BEATSTACK_APP_MODE || "manager";
    bootLog("modo manager detectado");
  } else {
    bootLog("modo manager NAO detectado em " + getResourcesPath());
  }
}

ensureManagerEnv();
bootLog("pre-electron ok");

const { app, BrowserWindow, shell, ipcMain, clipboard, dialog } = require("electron");
const { spawn } = require("child_process");
const crypto = require("crypto");
const http = require("http");
const https = require("https");
const { copyFileToClipboardWin } = require("./clipboard-win");
const { saveSampleLocal, saveSampleToFavorite, removeSampleFromFavorite } = require("./save-sample-local");
const {
  listFavoriteFolders,
  createFavoriteFolder,
  setActiveFavoriteFolder,
  deleteFavoriteFolder,
  getActiveFolderSlug,
  getActiveFolderId,
  addSampleToFolder,
  removeSampleFromFolder,
  listSampleIdsInFolder,
} = require("./favorite-folders");
const { getStatus: getLegalStatus, accept: acceptLegal } = require("./legal-acceptance");

const LEGAL_TERMS_VERSION = "2026-06-24";
const LEGAL_PRIVACY_VERSION = "2026-06-24";

/** Porta local do servidor embutido (evita conflito com outros apps na 3000). */
const DEFAULT_MANAGER_PORT = "47821";
const PORT = process.env.PORT || process.env.BEATSTACK_MANAGER_PORT || DEFAULT_MANAGER_PORT;
const LOCAL_URL = `http://127.0.0.1:${PORT}`;

let serverUrlCache = null;

function isManagerApp() {
  return process.env.BEATSTACK_APP_MODE === "manager" || readManagerModeFromBundle();
}

function getAppTitleValue() {
  return isManagerApp() ? "BeatStack Manager" : "BeatStack Library";
}

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

function readBundledServerUrl() {
  if (!app.isPackaged || isManagerApp()) return null;
  try {
    const bundledPath = path.join(process.resourcesPath, "default-server.json");
    if (!fs.existsSync(bundledPath)) return null;
    const raw = fs.readFileSync(bundledPath, "utf-8");
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
  if (isManagerApp()) return LOCAL_URL;

  const fromEnv = process.env.BEATSTACK_SERVER_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const fromFile = readServerUrlFromConfig();
  if (fromFile) return fromFile;
  const fromBundled = readBundledServerUrl();
  if (fromBundled) return fromBundled;
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
let splashWindow = null;
let serverProcess = null;
let managerRuntimeEnvCache = null;

function logStartup(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    const logPath = path.join(app.getPath("appData"), "beatstack-manager", "startup.log");
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `${line}\n`, "utf8");
  } catch {
    /* ignore */
  }
}

function getManagerDataDir() {
  // Sem espaços no caminho — SQLite/Prisma quebram com "BeatStack Manager" na URL.
  return path.join(app.getPath("appData"), "beatstack-manager");
}

function getStorageConfigPath() {
  return path.join(getManagerDataDir(), "storage-config.json");
}

function readStorageRootFromConfig(defaultRoot) {
  const configPath = getStorageConfigPath();
  if (!fs.existsSync(configPath)) return defaultRoot;
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (typeof cfg.storageRoot === "string" && cfg.storageRoot.trim()) {
      return path.resolve(cfg.storageRoot.trim());
    }
  } catch {
    /* ignore */
  }
  return defaultRoot;
}

function writeStorageRootConfig(storageRoot) {
  const dataDir = getManagerDataDir();
  fs.mkdirSync(dataDir, { recursive: true });
  const resolved = path.resolve(storageRoot);
  fs.mkdirSync(resolved, { recursive: true });
  fs.writeFileSync(
    getStorageConfigPath(),
    JSON.stringify({ storageRoot: resolved }, null, 2),
    "utf8",
  );
  return resolved;
}

function getManagerRuntimeEnv() {
  if (managerRuntimeEnvCache) return managerRuntimeEnvCache;

  const dataDir = getManagerDataDir();
  const dbPath = path.join(dataDir, "manager.db");
  const defaultStorageDir = path.join(dataDir, "storage");
  const jwtPath = path.join(dataDir, "jwt.secret");
  const storageConfigPath = getStorageConfigPath();

  fs.mkdirSync(dataDir, { recursive: true });
  const storageDir = readStorageRootFromConfig(defaultStorageDir);
  fs.mkdirSync(storageDir, { recursive: true });

  let jwtSecret;
  if (fs.existsSync(jwtPath)) {
    jwtSecret = fs.readFileSync(jwtPath, "utf8").trim();
  } else {
    jwtSecret = crypto.randomBytes(48).toString("base64");
    fs.writeFileSync(jwtPath, jwtSecret, "utf8");
  }

  // Offline por enquanto: sem login/licença. Código de auth permanece no app.
  managerRuntimeEnvCache = {
    DATABASE_URL: `file:${dbPath.replace(/\\/g, "/")}`,
    BEATSTACK_STORAGE_ROOT: storageDir,
    BEATSTACK_STORAGE_CONFIG: storageConfigPath,
    JWT_SECRET: jwtSecret,
    BEATSTACK_APP_MODE: "manager",
    NEXT_PUBLIC_BEATSTACK_APP_MODE: "manager",
    AUTH_DISABLED: "true",
    LICENSE_SERVER_URL:
      process.env.LICENSE_SERVER_URL ?? "https://license.paulolinks.com",
  };

  logStartup("[BeatStack] Dados locais: " + dataDir);
  logStartup("[BeatStack] Packs storage: " + storageDir);
  logStartup("[BeatStack] AUTH_DISABLED (offline Manager)");
  return managerRuntimeEnvCache;
}

function runPackagedNode(args, extraEnv = {}) {
  const standaloneDir = path.join(process.resourcesPath, "standalone");
  const nodeSpawn = getPackagedNodeSpawn();
  return new Promise((resolve, reject) => {
    const child = spawn(nodeSpawn.command, args, {
      cwd: standaloneDir,
      shell: false,
      stdio: "inherit",
      env: {
        ...process.env,
        ...nodeSpawn.extraEnv,
        PORT,
        HOSTNAME: "127.0.0.1",
        ...extraEnv,
      },
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Falha ao executar: ${args.join(" ")} (code ${code})`));
    });
  });
}

function prepareManagerDatabase() {
  const env = getManagerRuntimeEnv();
  const dbPath = env.DATABASE_URL.replace(/^file:/, "").replace(/\//g, path.sep);

  const legacyDir = path.join(app.getPath("userData"), "beatstack-manager");
  const legacyDb = path.join(legacyDir, "manager.db");
  if (!fs.existsSync(dbPath) && fs.existsSync(legacyDb)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.copyFileSync(legacyDb, dbPath);
    logStartup("Banco migrado de pasta antiga");
  }

  if (fs.existsSync(dbPath)) {
    logStartup("Banco local ok: " + dbPath);
    return;
  }

  const template = path.join(process.resourcesPath, "manager-template.db");
  if (!fs.existsSync(template)) {
    logStartup("Template de banco ausente: " + template);
    return;
  }

  fs.copyFileSync(template, dbPath);
  logStartup("Banco local criado: " + dbPath);
}

function getPackagedServerEnv() {
  const base = {
    PORT,
    HOSTNAME: "127.0.0.1",
    BEATSTACK_DESKTOP: "1",
    NODE_ENV: "production",
  };
  if (isManagerApp()) {
    return { ...base, ...getManagerRuntimeEnv(), BEATSTACK_ALLOW_VPS_SYNC: "1" };
  }
  return { ...base, BEATSTACK_ALLOW_VPS_SYNC: "1" };
}

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

ipcMain.handle("shell:open-path", (_event, targetPath) => {
  if (!targetPath || typeof targetPath !== "string") {
    return { ok: false, error: "Caminho inválido" };
  }
  return shell.openPath(targetPath).then((err) =>
    err ? { ok: false, error: err } : { ok: true },
  );
});

ipcMain.handle("samples:save-local", (_event, payload) => {
  return saveSampleLocal(payload);
});

ipcMain.handle("samples:save-favorite", (_event, payload) => {
  const userData = app.getPath("userData");
  const folderSlug = payload.folderSlug ?? getActiveFolderSlug(userData);
  return saveSampleToFavorite({ ...payload, folderSlug });
});

ipcMain.handle("samples:remove-favorite", (_event, payload) => {
  const userData = app.getPath("userData");
  const folderSlug = payload.folderSlug ?? getActiveFolderSlug(userData);
  return removeSampleFromFavorite({ ...payload, folderSlug });
});

ipcMain.handle("favorite-folders:list", () => {
  return listFavoriteFolders(app.getPath("userData"));
});

ipcMain.handle("favorite-folders:create", (_event, name) => {
  return createFavoriteFolder(app.getPath("userData"), name);
});

ipcMain.handle("favorite-folders:set-active", (_event, folderId) => {
  return setActiveFavoriteFolder(app.getPath("userData"), folderId ?? null);
});

ipcMain.handle("favorite-folders:delete", (_event, folderId) => {
  return deleteFavoriteFolder(app.getPath("userData"), folderId);
});

ipcMain.handle("favorite-folders:add-sample", (_event, payload) => {
  return addSampleToFolder(app.getPath("userData"), payload);
});

ipcMain.handle("favorite-folders:remove-sample", (_event, payload) => {
  return removeSampleFromFolder(app.getPath("userData"), payload);
});

ipcMain.handle("favorite-folders:list-sample-ids", (_event, folderId) => {
  return listSampleIdsInFolder(app.getPath("userData"), folderId);
});

ipcMain.handle("legal:get-status", () => {
  return getLegalStatus(app.getPath("userData"), LEGAL_TERMS_VERSION, LEGAL_PRIVACY_VERSION);
});

ipcMain.handle("legal:accept", (_event, record) => {
  return acceptLegal(app.getPath("userData"), record);
});

ipcMain.handle("dialog:select-directory", async (_event, opts = {}) => {
  const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
    title: opts.title || "Selecionar pasta",
    defaultPath: opts.defaultPath || undefined,
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true };
  }
  return { ok: true, path: result.filePaths[0] };
});

ipcMain.handle("storage:get", () => {
  const dataDir = getManagerDataDir();
  const defaultRoot = path.join(dataDir, "storage");
  const storageRoot = readStorageRootFromConfig(defaultRoot);
  return {
    ok: true,
    storageRoot,
    defaultRoot,
    configPath: getStorageConfigPath(),
  };
});

ipcMain.handle("storage:set", (_event, storageRoot) => {
  if (!storageRoot || typeof storageRoot !== "string") {
    return { ok: false, error: "Pasta inválida" };
  }
  try {
    const resolved = writeStorageRootConfig(storageRoot);
    if (managerRuntimeEnvCache) {
      managerRuntimeEnvCache.BEATSTACK_STORAGE_ROOT = resolved;
    }
    process.env.BEATSTACK_STORAGE_ROOT = resolved;
    process.env.BEATSTACK_STORAGE_CONFIG = getStorageConfigPath();
    return { ok: true, storageRoot: resolved };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao salvar pasta" };
  }
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
  const checkUrl = isManagerApp() ? `${url.replace(/\/$/, "")}/` : url;
  return httpGet(checkUrl).then((code) => code >= 200 && code < 400).catch(() => false);
}

function getPackagedNodeSpawn() {
  const serverBin = path.join(path.dirname(process.execPath), "beatstack-server.exe");
  const command = app.isPackaged && fs.existsSync(serverBin) ? serverBin : process.execPath;
  return {
    command,
    args: ["server.js"],
    shell: false,
    extraEnv: { ELECTRON_RUN_AS_NODE: "1" },
  };
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
      env: {
        ...process.env,
        PORT,
        BEATSTACK_DESKTOP: "1",
        BEATSTACK_ALLOW_VPS_SYNC: "1",
        ...(isManagerApp()
          ? {
              ...getManagerRuntimeEnv(),
              LICENSE_SERVER_URL:
                process.env.LICENSE_SERVER_URL ?? "https://license.paulolinks.com",
            }
          : {}),
      },
    });
    return;
  }

  const standaloneDir = path.join(process.resourcesPath, "standalone");
  const nodeSpawn = getPackagedNodeSpawn();
  serverProcess = spawn(nodeSpawn.command, nodeSpawn.args, {
    cwd: standaloneDir,
    shell: nodeSpawn.shell,
    stdio: "inherit",
    env: {
      ...process.env,
      ...nodeSpawn.extraEnv,
      ...getPackagedServerEnv(),
    },
  });

  serverProcess.on("error", (err) => {
    console.error("[BeatStack] Falha ao iniciar servidor local:", err);
  });

  serverProcess.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error("[BeatStack] Servidor local encerrou:", code, signal);
    }
  });
}

function waitForServer(retries = 180) {
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

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 220,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    title: getAppTitleValue(),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const html = `<!doctype html><html><body style="margin:0;background:#0a0a0c;color:#ededed;font-family:Segoe UI,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><div style="font-size:18px;font-weight:600;margin-bottom:8px">${getAppTitleValue()}</div><div style="font-size:13px;color:#888">Iniciando servidor local...</div></div></body></html>`;
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function closeSplashWindow() {
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
}

function showStartupError(message) {
  closeSplashWindow();
  dialog.showErrorBox(
    getAppTitleValue(),
    `${message}\n\nLog: ${path.join(app.getPath("appData"), "beatstack-manager", "startup.log")}`,
  );
}

function createWindow() {
  closeSplashWindow();
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: getAppTitleValue(),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Manager offline: entra direto na biblioteca. Library (cliente) mantém aceite + login.
  const startPath = isManagerApp() ? "/" : `/legal/accept?next=${encodeURIComponent("/login")}`;
  mainWindow.loadURL(`${getServerUrl()}${startPath}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  if (isManagerApp()) {
    createSplashWindow();
  }

  const serverUrl = getServerUrl();
  const remote = !isManagerApp() && isRemoteServerUrl(serverUrl);

  if (isManagerApp()) {
    logStartup("Modo Manager (local)");
    if (app.isPackaged) {
      prepareManagerDatabase();
    }
    const alreadyRunning = await isServerUp(LOCAL_URL);
    if (!alreadyRunning) {
      logStartup("Iniciando servidor em " + LOCAL_URL);
      startServer();
    }
  } else if (remote) {
    logStartup("Modo cliente remoto → " + serverUrl);
  } else {
    const alreadyRunning = await isServerUp(LOCAL_URL);
    if (!alreadyRunning) {
      startServer();
    }
  }

  try {
    await waitForServer();
    logStartup("Servidor pronto");
    createWindow();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStartup("Falha ao iniciar: " + message);
    showStartupError(
      "Não foi possível iniciar o servidor local.\n\nAguarde 1 minuto e tente de novo. Se persistir, reinstale o app.",
    );
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
