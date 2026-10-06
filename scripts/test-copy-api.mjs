import fs from "fs";
import path from "path";
import os from "os";
import http from "http";

const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const dataDir = path.join(appData, "beatstack-manager");
const dbPath = path.join(dataDir, "manager.db");
const storageRoot = path.join(dataDir, "storage");
const jwtPath = path.join(dataDir, "jwt.secret");

process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, "/")}`;
process.env.BEATSTACK_STORAGE_ROOT = storageRoot;
process.env.BEATSTACK_APP_MODE = "manager";
process.env.AUTH_DISABLED = "true";

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const sample = await prisma.sample.findFirst();
await prisma.$disconnect();

if (!sample) {
  console.error("No sample");
  process.exit(1);
}

const port = 47822;
const serverProc = await import("child_process").then(({ spawn }) =>
  spawn("npx", ["next", "start", "-p", String(port)], {
    cwd: process.cwd(),
    shell: true,
    stdio: "pipe",
    env: { ...process.env },
  }),
);

function waitForServer(retries = 60) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = () => {
      n++;
      const req = http.get(`http://127.0.0.1:${port}/login`, (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 500) resolve();
        else if (n >= retries) reject(new Error("timeout"));
        else setTimeout(tick, 500);
      });
      req.on("error", () => {
        if (n >= retries) reject(new Error("timeout"));
        else setTimeout(tick, 500);
      });
    };
    tick();
  });
}

try {
  await waitForServer();
  const body = JSON.stringify({ folder: "downloads" });
  const result = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/samples/${sample.id}/copy`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, data }));
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });

  console.log("Status:", result.status);
  console.log("Body:", result.data);
  if (result.status !== 200) process.exitCode = 1;
} finally {
  serverProc.kill();
}
