import { isLicenseServerMode } from "@/lib/app-mode";

/** Detecta servidor de licenças pelo env ou subdomínio license.* */
export function isLicenseHost(host: string | null | undefined): boolean {
  if (isLicenseServerMode()) return true;
  if (!host) return false;
  const hostname = host.split(":")[0].toLowerCase();
  return hostname === "license" || hostname.startsWith("license.");
}
