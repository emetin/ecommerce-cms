import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME, isAuthenticatedAdmin } from "./lib/admin-auth";

function isProtectedApiRoute(pathname: string) {
  return (
    pathname.startsWith("/api/products") ||
    pathname.startsWith("/api/blog") ||
    pathname.startsWith("/api/collections")
  );
}

function isAllowedAdminAuthRoute(pathname: string) {
  return (
    pathname === "/api/admin-auth/login" ||
    pathname === "/api/admin-auth/logout" ||
    pathname === "/api/admin-auth/csrf"
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isPortalRoute = pathname === "/portal-ptx-admin";
  const isAdminAuthRoute = pathname.startsWith("/api/admin-auth");
  const protectedApiRoute = isProtectedApiRoute(pathname);

  if (!isAdminRoute && !isPortalRoute && !isAdminAuthRoute && !protectedApiRoute) {
    return NextResponse.next();
  }

  if (isAdminAuthRoute && isAllowedAdminAuthRoute(pathname)) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isLoggedIn = await isAuthenticatedAdmin(authCookie);

  if (isPortalRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/admin/products", request.url));
    }

    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (protectedApiRoute) {
      return NextResponse.json(
        { ok: false, error: "Yetkisiz erişim." },
        { status: 401 }
      );
    }

    return NextResponse.redirect(new URL("/portal-ptx-admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/portal-ptx-admin",
    "/api/admin-auth/:path*",
    "/api/products/:path*",
    "/api/blog/:path*",
    "/api/collections/:path*",
  ],
};