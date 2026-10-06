import type { SyncVpsConfig } from "@/lib/sync-vps/config";

const DEFAULT_LIBRARY_HOST = "library.paulolinks.com";
const LICENSE_HOSTS = new Set([
  "license.paulolinks.com",
  "license.srv983653.hstgr.cloud",
]);

/** Rejeita root@IP e normaliza para URL HTTPS do BeatStack Library. */
export function normalizeVpsUrl(input: string): string {
  const raw = input.trim().replace(/\/$/, "");
  if (!raw) {
    throw new Error("Informe a URL do Library no VPS");
  }

  if (/^root@/i.test(raw) || /^ssh:\/\//i.test(raw)) {
    throw new Error(
      `Não use SSH (root@IP). Use a URL HTTPS do Library, ex: https://${DEFAULT_LIBRARY_HOST}`,
    );
  }

  if (/^[\d.]+(?::\d+)?$/i.test(raw)) {
    throw new Error(
      `IP sozinho não funciona. Use https://${DEFAULT_LIBRARY_HOST} (domínio do Library, não o SSH)`,
    );
  }

  let url = raw;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("URL do VPS inválida");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("A URL do VPS deve começar com https://");
  }

  if (LICENSE_HOSTS.has(parsed.hostname)) {
    throw new Error(
      "Use o domínio do Library (library.*), não o servidor de licenças (license.*)",
    );
  }

  return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, "");
}

export function validateSyncVpsConfig(
  vpsUrl: string,
  email: string,
  password: string,
): SyncVpsConfig {
  const normalizedUrl = normalizeVpsUrl(vpsUrl);
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Informe o e-mail admin do Library no VPS");
  }
  if (!password) {
    throw new Error("Informe a senha do admin do Library no VPS");
  }
  return {
    vpsUrl: normalizedUrl,
    email: normalizedEmail,
    password,
  };
}
