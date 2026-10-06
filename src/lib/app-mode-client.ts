export function isManagerModeClient(): boolean {
  return process.env.NEXT_PUBLIC_BEATSTACK_APP_MODE === "manager";
}

export function isLibraryDesktopClient(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.beatstack?.isDesktop) && !isManagerModeClient() && !isLicenseServerModeClient();
}

/** Library (VPS, web ou desktop): pastas de favoritos salvas no servidor, por usuário. */
export function usesCloudFavoriteFoldersClient(): boolean {
  return !isManagerModeClient() && !isLicenseServerModeClient();
}

export function usesFavoriteFoldersClient(): boolean {
  return isManagerModeClient() || usesCloudFavoriteFoldersClient();
}

export function isLicenseServerModeClient(): boolean {
  if (process.env.NEXT_PUBLIC_BEATSTACK_APP_MODE === "license") return true;
  if (typeof window !== "undefined") {
    return window.location.hostname.startsWith("license.");
  }
  return false;
}

export function getAppTitleClient(): string {
  if (isManagerModeClient()) return "BeatStack Manager";
  if (isLicenseServerModeClient()) return "BeatStack Manager Licenciamento";
  return "BeatStack Library";
}
