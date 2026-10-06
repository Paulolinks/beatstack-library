import { getSessionCookieName } from "@/lib/auth/session";

const LICENSE_COOKIE = "beatstack_license";

export function getLicenseServerUrl(): string {
  const url =
    process.env.LICENSE_SERVER_URL ??
    process.env.NEXT_PUBLIC_LICENSE_SERVER_URL ??
    "https://license.paulolinks.com";
  return url.replace(/\/$/, "");
}

export function getLicenseCookieName(): string {
  return LICENSE_COOKIE;
}

function extractSessionCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const parts = setCookieHeader.split(/,(?=\s*beatstack_session=)/);
  for (const part of parts) {
    const match = part.match(/beatstack_session=([^;]+)/);
    if (match?.[1]) return match[1];
  }
  return null;
}

export type LicenseLoginResult =
  | {
      ok: true;
      token: string;
      user: { email: string; name: string | null; role: string };
    }
  | { ok: false; error: string; status: number; pending?: boolean };

export async function loginViaLicenseServer(
  email: string,
  password: string,
): Promise<LicenseLoginResult> {
  const res = await fetch(`${getLicenseServerUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      client: "manager",
      deviceLabel: "BeatStack Manager",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    pending?: boolean;
    user?: { email: string; name: string | null; role: string };
  };

  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? "Falha no login",
      status: res.status,
      pending: data.pending,
    };
  }

  const token = extractSessionCookie(res.headers.get("set-cookie"));
  if (!token || !data.user) {
    return { ok: false, error: "Resposta inválida do servidor de licença", status: 502 };
  }

  return { ok: true, token, user: data.user };
}

export type LicenseMeResult = {
  user: { email: string; name: string | null; role: string } | null;
  reason?: "SESSION_REPLACED" | "INVALID_TOKEN" | null;
};

export async function fetchLicenseSession(token: string): Promise<LicenseMeResult> {
  const res = await fetch(`${getLicenseServerUrl()}/api/auth/me`, {
    headers: { Cookie: `${getSessionCookieName()}=${token}` },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as LicenseMeResult;
  return data;
}

export async function logoutViaLicenseServer(token: string | undefined): Promise<void> {
  if (!token) return;
  try {
    await fetch(`${getLicenseServerUrl()}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: `${getSessionCookieName()}=${token}` },
    });
  } catch {
    /* ignore */
  }
}
