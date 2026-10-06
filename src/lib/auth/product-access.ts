import { isAllowedAdminEmail } from "@/lib/auth/admin-policy";

export function isManagerClientLogin(body: {
  client?: string;
  deviceLabel?: string;
}): boolean {
  if (body.client === "manager") return true;
  return (body.deviceLabel?.includes("BeatStack Manager") ?? false);
}

/** Login servidor-a-servidor (Sync VPS) — não invalida sessão do app Library. */
export function isSyncServiceLogin(body: { client?: string }): boolean {
  return body.client === "sync";
}

export function hasManagerLicense(email: string, managerLicensed: boolean): boolean {
  return managerLicensed || isAllowedAdminEmail(email);
}

export function hasLibraryAccess(email: string, approved: boolean): boolean {
  return approved || isAllowedAdminEmail(email);
}
