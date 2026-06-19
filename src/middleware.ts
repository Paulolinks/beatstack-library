import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookieName, isAuthDisabled, verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/api/auth/logout")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  if (isAuthDisabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = token ? await verifySessionToken(token) : null;
  const isApi = pathname.startsWith("/api/");

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && session?.approved) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!session || !session.approved) {
    if (isApi) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/import");

  if (isAdminRoute && session.role !== "admin") {
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
