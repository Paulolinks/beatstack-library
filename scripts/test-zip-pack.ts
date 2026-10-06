import fs from "fs";
import path from "path";
import os from "os";
import { zipPackDirectory } from "../src/lib/sync-vps/zip-pack";

const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
process.env.BEATSTACK_STORAGE_ROOT = path.join(appData, "beatstack-manager", "storage");

const out = path.join(process.env.BEATSTACK_STORAGE_ROOT, "inbox", "test-sync.zip");

zipPackDirectory("exclusive-atmospheres-2026-1", out)
  .then(() => {
    console.log("ZIP OK", (fs.statSync(out).size / 1024).toFixed(1), "KB");
    fs.unlinkSync(out);
  })
  .catch((e) => {
    console.error("FAIL", e);
    process.exit(1);
  });
