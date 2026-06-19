import path from "path";
import fs from "fs";

const ROOT = process.cwd();

export function getStorageRoot(): string {
  return path.join(ROOT, "storage");
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
  if (absolutePath.startsWith(storageRoot)) {
    return absolutePath.slice(storageRoot.length + 1).replace(/\\/g, "/");
  }
  return absolutePath.replace(/\\/g, "/");
}

export function fromRelativeStoragePath(relativePath: string): string {
  return path.join(getStorageRoot(), relativePath);
}
