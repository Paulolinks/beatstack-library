import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLibraryMode, isLicenseServerMode, isManagerMode } from "@/lib/app-mode";
import { isLicenseHost } from "@/lib/app-mode-request";
import { isAdminSession } from "@/lib/auth/admin-policy";
import { getLicenseCookieName } from "@/lib/auth/license-server";
import { getSessionCookieName, isAuthDisabled, verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login"];

const LICENSE_ALLOWED_PAGE_PREFIXES = [
  "/admin/dashboard",
  "/admin/manager-licenses",
  "/admin/campaigns",
  "/login",
];
const LICENSE_ALLOWED_API_PREFIXES = [
  "/api/auth/",
  "/api/admin/users",
  "/api/admin/license-stats",
  "/api/admin/campaigns",
  "/api/campaigns/",
];

const LIBRARY_BLOCKED_ON_LICENSE = [
  /^\/packs/,
  /^\/search/,
  /^\/collections/,
  /^\/admin\/import/,
  /^\/admin\/packs/,
  /^\/admin\/users$/,
  /^\/api\/packs/,
  /^\/api\/samples/,
  /^\/api\/import/,
  /^\/api\/covers/,
  /^\/api\/audio/,
  /^\/api\/assets/,
  /^\/api\/tags/,
  /^\/api\/library/,
  /^\/api\/manager/,
  /^\/api\/webhooks/,
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/api/auth/logout")) return true;
  if (isLibraryMode() && pathname.startsWith("/api/webhooks/register-user")) return true;
  return false;
}

function isManagerAdminOnlyRoute(pathname: string): boolean {
  return pathname.startsWith("/admin/users") || pathname.startsWith("/api/admin/users");
}

function isLicenseAllowedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (LICENSE_ALLOWED_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (LICENSE_ALLOWED_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return true;
  }
  return false;
}

function isLibraryBlockedOnLicense(pathname: string): boolean {
  return LIBRARY_BLOCKED_ON_LICENSE.some((re) => re.test(pathname));
}

export async function middleware(request: NextRequest) {
  if (isAuthDisabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isLicenseHost(request.headers.get("host") ?? request.nextUrl.hostname)) {
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }

    const isCampaignUserApi =
      pathname.startsWith("/api/campaigns/") && !pathname.startsWith("/api/admin/campaigns");

    if (isCampaignUserApi) {
      const token = request.cookies.get(getSessionCookieName())?.value;
      const session = token ? await verifySessionToken(token) : null;
      if (!session) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
      }
      return NextResponse.next();
    }

    if (isLibraryBlockedOnLicense(pathname) || !isLicenseAllowedPath(pathname)) {
      if (isApi) {
        return NextResponse.json({ error: "Não disponível neste servidor" }, { status: 404 });
      }
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    const token = request.cookies.get(getSessionCookieName())?.value;
    const session = token ? await verifySessionToken(token) : null;
    const isAdmin =
      session &&
      isAdminSession(session.email, typeof session.role === "string" ? session.role : "user");

    if (!isAdmin) {
      if (isApi) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname === "/") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (isManagerMode()) {
    const license = request.cookies.get(getLicenseCookieName())?.value;
    if (!license) {
      if (isApi) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isManagerAdminOnlyRoute(pathname)) {
      if (isApi) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/manager-licenses")) {
    if (isApi) {
      return NextResponse.json({ error: "Gerencie licenças em license.paulolinks.com" }, { status: 404 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session || !session.approved || !session.sessionId) {
    if (isApi) {
      return NextResponse.json(
        { error: "Não autenticado", reason: session ? "SESSION_REPLACED" : undefined },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    if (token && !session) {
      loginUrl.searchParams.set("reason", "other_device");
    }
    return NextResponse.redirect(loginUrl);
  }

  const isAdminRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/import") ||
    (request.method !== "GET" && /^\/api\/packs\/[^/]+$/.test(pathname)) ||
    (request.method === "POST" && /^\/api\/packs\/[^/]+\/cover$/.test(pathname));

  const hasAdminAccess =
    session &&
    isAdminSession(session.email, typeof session.role === "string" ? session.role : "user");

  if (isAdminRoute && !hasAdminAccess) {
    if (isApi) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
