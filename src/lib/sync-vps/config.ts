import fs from "fs";
import path from "path";
import { isLicenseServerMode } from "@/lib/app-mode";
import { getStorageRoot } from "@/lib/storage";

export type SyncVpsConfig = {
  vpsUrl: string;
  email: string;
  password: string;
};

const CONFIG_FILE = "sync-vps.config.json";

export function isSyncVpsEnabled(): boolean {
  if (isLicenseServerMode()) return false;
  const flag = process.env.BEATSTACK_ALLOW_VPS_SYNC?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  return process.env.NODE_ENV !== "production";
}

function configPath(): string {
  return path.join(getStorageRoot(), CONFIG_FILE);
}

export function loadSyncVpsConfig(): SyncVpsConfig | null {
  const fromEnv =
    process.env.SYNC_VPS_URL?.trim() &&
    process.env.SYNC_VPS_EMAIL?.trim() &&
    process.env.SYNC_VPS_PASSWORD
      ? {
          vpsUrl: process.env.SYNC_VPS_URL.trim().replace(/\/$/, ""),
          email: process.env.SYNC_VPS_EMAIL.trim(),
          password: process.env.SYNC_VPS_PASSWORD,
        }
      : null;
  if (fromEnv) return fromEnv;

  try {
    const raw = fs.readFileSync(configPath(), "utf-8");
    const data = JSON.parse(raw) as Partial<SyncVpsConfig>;
    if (!data.vpsUrl?.trim() || !data.email?.trim() || !data.password) return null;
    return {
      vpsUrl: data.vpsUrl.trim().replace(/\/$/, ""),
      email: data.email.trim(),
      password: data.password,
    };
  } catch {
    return null;
  }
}

export function saveSyncVpsConfig(config: SyncVpsConfig): void {
  const dir = getStorageRoot();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    configPath(),
    JSON.stringify(
      {
        vpsUrl: config.vpsUrl.trim().replace(/\/$/, ""),
        email: config.email.trim(),
        password: config.password,
      },
      null,
      2,
    ),
    "utf-8",
  );
}

export function clearSyncVpsConfig(): void {
  try {
    fs.unlinkSync(configPath());
  } catch {
    /* ignore */
  }
}

export function maskSyncVpsConfig(config: SyncVpsConfig | null) {
  if (!config) return null;
  return {
    vpsUrl: config.vpsUrl,
    email: config.email,
    hasPassword: Boolean(config.password),
  };
}
