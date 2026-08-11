import path from "path";
import fs from "fs";

const ROOT = process.cwd();

function readStorageRootFromConfigFile(): string | null {
  const configPath = process.env.BEATSTACK_STORAGE_CONFIG?.trim();
  if (!configPath || !fs.existsSync(configPath)) return null;
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const cfg = JSON.parse(raw) as { storageRoot?: string };
    if (typeof cfg.storageRoot === "string" && cfg.storageRoot.trim()) {
      return path.resolve(cfg.storageRoot.trim());
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function getStorageConfigPath(): string | null {
  const configPath = process.env.BEATSTACK_STORAGE_CONFIG?.trim();
  return configPath || null;
}

export function getDefaultStorageRoot(): string {
  if (process.env.BEATSTACK_STORAGE_ROOT) {
    return process.env.BEATSTACK_STORAGE_ROOT;
  }
  return path.join(ROOT, "storage");
}

export function getStorageRoot(): string {
  const fromConfig = readStorageRootFromConfigFile();
  if (fromConfig) return fromConfig;
  return getDefaultStorageRoot();
}

export function setStorageRoot(storageRoot: string): string {
  const resolved = path.resolve(storageRoot);
  fs.mkdirSync(resolved, { recursive: true });

  const configPath = getStorageConfigPath();
  if (configPath) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({ storageRoot: resolved }, null, 2),
      "utf8",
    );
  }

  process.env.BEATSTACK_STORAGE_ROOT = resolved;
  ensureStorageDirs();
  return resolved;
}

export function getInboxDir(): string {
  return path.join(getStorageRoot(), "inbox");
}

export function getPacksDir(): string {
  return path.join(getStorageRoot(), "packs");
}

export function getPackDir(slug: string): string {
  return path.join(getPacksDir(), slug);
}

export function ensureStorageDirs(): void {
  for (const dir of [getStorageRoot(), getInboxDir(), getPacksDir()]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function toRelativeStoragePath(absolutePath: string): string {
  const storageRoot = getStorageRoot();
  const normalizedAbs = path.resolve(absolutePath);
  const normalizedRoot = path.resolve(storageRoot);
  if (
    normalizedAbs === normalizedRoot ||
    normalizedAbs.startsWith(normalizedRoot + path.sep)
  ) {
    return path.relative(normalizedRoot, normalizedAbs).replace(/\\/g, "/");
  }
  return absolutePath.replace(/\\/g, "/");
}

export function fromRelativeStoragePath(relativePath: string): string {
  return path.join(getStorageRoot(), relativePath);
}
