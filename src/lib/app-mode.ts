/** BeatStack Library (VPS) | BeatStack Manager (desktop) | License server (VPS). */
export type AppMode = "library" | "manager" | "license";

export function getAppMode(): AppMode {
  const raw =
    process.env.BEATSTACK_APP_MODE ??
    process.env.NEXT_PUBLIC_BEATSTACK_APP_MODE ??
    "library";
  if (raw === "manager") return "manager";
  if (raw === "license") return "license";
  return "library";
}

export function isManagerMode(): boolean {
  return getAppMode() === "manager";
}

export function isLicenseServerMode(): boolean {
  return getAppMode() === "license";
}

export function isLibraryMode(): boolean {
  return getAppMode() === "library";
}

export function getAppTitle(): string {
  if (isManagerMode()) return "BeatStack Manager";
  if (isLicenseServerMode()) return "BeatStack Manager Licenciamento";
  return "BeatStack Library";
}

export function getProductFolderName(): string {
  if (isManagerMode() || isLicenseServerMode()) return "BeatStack Manager";
  return "BeatStack Library";
}
