import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME, isAuthenticatedAdmin } from "./lib/admin-auth";
import {
  CUSTOMER_COOKIE_NAME,
  isAuthenticatedCustomer,
} from "./lib/customer-auth";

import {
  isAdminPageRoute,
  isAdminPortalRoute,
  isAdminAuthRoute,
  isAllowedAdminAuthRoute,
  isProtectedAdminApiRoute,
  isCustomerPortalLoginRoute,
  isCustomerAuthRoute,
  isAllowedCustomerAuthRoute,
  isCustomerProtectedRoute,
  isPublicOrderRoute,
} from "./lib/route-access";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ROUTE TYPE TESPİTİ
  const isAdminRoute = isAdminPageRoute(pathname);
  const isPortalRoute = isAdminPortalRoute(pathname);
  const adminAuthRoute = isAdminAuthRoute(pathname);
  const protectedAdminApiRoute = isProtectedAdminApiRoute(pathname);

  const isCustomerPortalLogin = isCustomerPortalLoginRoute(pathname);
  const customerAuthRoute = isCustomerAuthRoute(pathname);
  const customerProtectedRoute = isCustomerProtectedRoute(pathname);
  const publicOrderRoute = isPublicOrderRoute(pathname);

  const shouldCheckAdmin =
    isAdminRoute || isPortalRoute || adminAuthRoute || protectedAdminApiRoute;

  const shouldCheckCustomer =
    isCustomerPortalLogin || customerAuthRoute || customerProtectedRoute;

  // HİÇBİRİNE GİRMİYORSA DEVAM
  if (!shouldCheckAdmin && !shouldCheckCustomer && !publicOrderRoute) {
    return NextResponse.next();
  }

  // PUBLIC ORDER ROUTES
  if (publicOrderRoute) {
    return NextResponse.next();
  }

  // ADMIN AUTH (LOGIN / LOGOUT vs)
  if (adminAuthRoute && isAllowedAdminAuthRoute(pathname)) {
    return NextResponse.next();
  }

  // CUSTOMER AUTH (LOGIN / LOGOUT vs)
  if (customerAuthRoute && isAllowedCustomerAuthRoute(pathname)) {
    return NextResponse.next();
  }

  // ADMIN KONTROLÜ
  if (shouldCheckAdmin) {
    const adminAuthCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isAdminLoggedIn = await isAuthenticatedAdmin(adminAuthCookie);

    // ADMIN LOGIN SAYFASI
    if (isPortalRoute) {
      if (isAdminLoggedIn) {
        return NextResponse.redirect(new URL("/admin/products", request.url));
      }
      return NextResponse.next();
    }

    // ADMIN PROTECTED
    if ((isAdminRoute || protectedAdminApiRoute) && !isAdminLoggedIn) {
      if (protectedAdminApiRoute) {
        return NextResponse.json(
          { ok: false, error: "Yetkisiz admin erişimi." },
          { status: 401 }
        );
      }

      const loginUrl = new URL("/portal-ptx-admin", request.url);
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  // CUSTOMER KONTROLÜ
  if (shouldCheckCustomer) {
    const customerAuthCookie = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
    const isCustomerLoggedIn = await isAuthenticatedCustomer(
      customerAuthCookie
    );

    // CUSTOMER LOGIN PAGE
    if (isCustomerPortalLogin) {
      if (isCustomerLoggedIn) {
        return NextResponse.redirect(new URL("/account", request.url));
      }
      return NextResponse.next();
    }

    // CUSTOMER PROTECTED ROUTES
    if (customerProtectedRoute && !isCustomerLoggedIn) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { ok: false, error: "Müşteri girişi gerekli." },
          { status: 401 }
        );
      }

      const loginUrl = new URL("/portal-login", request.url);
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// ⚠️ BURASI ÇOK ÖNEMLİ → STATIC OLMAK ZORUNDA
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
    "/api/product-variants/:path*",
    "/api/upload/:path*",
    "/api/collection-products/:path*",

    "/portal-login",
    "/account/:path*",
    "/api/customer-auth/:path*",
    "/api/orders/:path*",
  ],
};