import os from "os";
import path from "path";
import fs from "fs";

export function getStagingDir(): string {
  const appData =
    process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  return path.join(appData, "BeatStackLibrary", "staging");
}

export function ensureStagingDir(): string {
  const dir = getStagingDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
