import path from "path";
import fs from "fs";

const storageRoot = "D:\\Beat Stack Library";
const dbPath = path.join(process.env.APPDATA || "", "beatstack-manager", "manager.db");
const configPath = path.join(process.env.APPDATA || "", "beatstack-manager", "storage-config.json");

process.env.BEATSTACK_APP_MODE = "manager";
process.env.AUTH_DISABLED = "true";
process.env.BEATSTACK_STORAGE_ROOT = storageRoot;
process.env.BEATSTACK_STORAGE_CONFIG = configPath;
process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, "/")}`;

console.log("packs dir:", path.join(storageRoot, "packs"));
console.log(
  "folders:",
  fs.readdirSync(path.join(storageRoot, "packs")).filter((n) => {
    return fs.statSync(path.join(storageRoot, "packs", n)).isDirectory();
  }),
);

const { syncPacksFromStorageFolder } = await import("../src/lib/import/sync-packs-folder.ts");
const result = await syncPacksFromStorageFolder({ removeMissing: true });
console.log(JSON.stringify(result, null, 2));
