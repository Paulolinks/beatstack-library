import { normalizeEmail } from "@/lib/auth/password";

const DEFAULT_ADMIN_EMAIL = "paulolinks16@gmail.com";

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? DEFAULT_ADMIN_EMAIL;
  return [...new Set(raw.split(",").map(normalizeEmail).filter(Boolean))];
}

export function isAllowedAdminEmail(email: string): boolean {
  return getAdminEmails().includes(normalizeEmail(email));
}

/** Papel efetivo — só e-mails autorizados podem ser admin. */
export function resolveEffectiveRole(email: string, dbRole: string): "admin" | "user" {
  return dbRole === "admin" && isAllowedAdminEmail(email) ? "admin" : "user";
}

/** Ao criar/atualizar usuário — nunca promove a admin se o e-mail não estiver na lista. */
export function assignableRole(email: string, requestedRole?: string): "admin" | "user" {
  if (requestedRole === "admin" && isAllowedAdminEmail(email)) {
    return "admin";
  }
  return "user";
}

export function isAdminSession(email: string, role: string): boolean {
  return role === "admin" && isAllowedAdminEmail(email);
}
