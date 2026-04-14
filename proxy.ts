import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME, isAuthenticatedAdmin } from "./lib/admin-auth";
import {
  CUSTOMER_COOKIE_NAME,
  isAuthenticatedCustomer,
} from "./lib/customer-auth";

function isProtectedAdminApiRoute(pathname: string) {
  return (
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/products") ||
    pathname.startsWith("/api/blog") ||
    pathname.startsWith("/api/collections") ||
    pathname.startsWith("/api/product-images") ||
    pathname.startsWith("/api/variants") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/collection-products")
  );
}

function isAllowedAdminAuthRoute(pathname: string) {
  return (
    pathname === "/api/admin-auth/login" ||
    pathname === "/api/admin-auth/logout" ||
    pathname === "/api/admin-auth/csrf"
  );
}

function isCustomerProtectedRoute(pathname: string) {
  return pathname.startsWith("/account") || pathname.startsWith("/api/orders");
}

function isCustomerAuthRoute(pathname: string) {
  return pathname.startsWith("/api/customer-auth");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isPortalRoute = pathname === "/portal-ptx-admin";
  const isAdminAuthRoute = pathname.startsWith("/api/admin-auth");
  const protectedAdminApiRoute = isProtectedAdminApiRoute(pathname);

  const isCustomerPortalLogin = pathname === "/portal-login";
  const customerProtectedRoute = isCustomerProtectedRoute(pathname);
  const customerAuthRoute = isCustomerAuthRoute(pathname);

  const shouldCheckAdmin =
    isAdminRoute || isPortalRoute || isAdminAuthRoute || protectedAdminApiRoute;

  const shouldCheckCustomer =
    isCustomerPortalLogin || customerProtectedRoute || customerAuthRoute;

  if (!shouldCheckAdmin && !shouldCheckCustomer) {
    return NextResponse.next();
  }

  if (isAdminAuthRoute && isAllowedAdminAuthRoute(pathname)) {
    return NextResponse.next();
  }

  if (
    customerAuthRoute &&
    (pathname === "/api/customer-auth/login" ||
      pathname === "/api/customer-auth/logout" ||
      pathname === "/api/customer-auth/me")
  ) {
    return NextResponse.next();
  }

  const adminAuthCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAdminLoggedIn = await isAuthenticatedAdmin(adminAuthCookie);

  if (isPortalRoute) {
    if (isAdminLoggedIn) {
      return NextResponse.redirect(new URL("/admin/products", request.url));
    }

    return NextResponse.next();
  }

  if (shouldCheckAdmin && !isPortalRoute && !isAdminLoggedIn) {
    if (protectedAdminApiRoute) {
      return NextResponse.json(
        { ok: false, error: "Yetkisiz admin erişimi." },
        { status: 401 }
      );
    }

    if (isAdminRoute) {
      return NextResponse.redirect(new URL("/portal-ptx-admin", request.url));
    }
  }

  const customerAuthCookie = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
  const isCustomerLoggedIn = await isAuthenticatedCustomer(customerAuthCookie);

  if (isCustomerPortalLogin) {
    if (isCustomerLoggedIn) {
      return NextResponse.redirect(new URL("/account", request.url));
    }

    return NextResponse.next();
  }

  if (customerProtectedRoute && !isCustomerLoggedIn) {
    if (pathname.startsWith("/api/orders")) {
      return NextResponse.json(
        { ok: false, error: "Müşteri girişi gerekli." },
        { status: 401 }
      );
    }

    return NextResponse.redirect(new URL("/portal-login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/portal-ptx-admin",
    "/api/admin/:path*",
    "/api/admin-auth/:path*",
    "/api/products/:path*",
    "/api/blog/:path*",
    "/api/collections/:path*",
    "/api/product-images/:path*",
    "/api/variants/:path*",
    "/api/upload/:path*",
    "/api/collection-products/:path*",
    "/portal-login",
    "/account/:path*",
    "/api/customer-auth/:path*",
    "/api/orders/:path*",
  ],
};