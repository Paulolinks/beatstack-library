export function useSecureAuthCookies(): boolean {
  if (process.env.BEATSTACK_DESKTOP === "1") return false;
  return process.env.NODE_ENV === "production";
}
