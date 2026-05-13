import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME } from "./lib/admin-auth";
import { CUSTOMER_COOKIE_NAME } from "./lib/customer-auth";

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

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

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

  if (!shouldCheckAdmin && !shouldCheckCustomer && !publicOrderRoute) {
    return NextResponse.next();
  }

  if (publicOrderRoute) {
    return NextResponse.next();
  }

  if (adminAuthRoute && isAllowedAdminAuthRoute(pathname)) {
    return NextResponse.next();
  }

  if (customerAuthRoute && isAllowedCustomerAuthRoute(pathname)) {
    return NextResponse.next();
  }

  if (shouldCheckAdmin) {
    const hasAdminCookie = Boolean(
      request.cookies.get(ADMIN_COOKIE_NAME)?.value
    );

    if (isPortalRoute) {
      if (hasAdminCookie) {
        return NextResponse.redirect(new URL("/admin/products", request.url));
      }

      return NextResponse.next();
    }

    if ((isAdminRoute || protectedAdminApiRoute) && !hasAdminCookie) {
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

  if (shouldCheckCustomer) {
    const hasCustomerCookie = Boolean(
      request.cookies.get(CUSTOMER_COOKIE_NAME)?.value
    );

    if (isCustomerPortalLogin) {
      if (hasCustomerCookie) {
        return NextResponse.redirect(new URL("/account", request.url));
      }

      return NextResponse.next();
    }

    if (customerProtectedRoute && !hasCustomerCookie) {
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

export const config = {
  matcher: [
    "/admin/:path*",
    "/portal-ptx-admin",

    "/api/admin/:path*",
    "/api/admin-auth/:path*",

    "/api/upload/:path*",

    "/api/products/create",
    "/api/products/update",
    "/api/products/delete",

    "/api/product-images/create",
    "/api/product-images/update",
    "/api/product-images/delete",
    "/api/product-images/fix-missing-alt-texts",

    "/api/variants/create",
    "/api/variants/update",
    "/api/variants/delete",

    "/api/product-variants/create",
    "/api/product-variants/update",
    "/api/product-variants/delete",

    "/api/collection-products/create",
    "/api/collection-products/update",
    "/api/collection-products/delete",

    "/portal-login",
    "/account/:path*",
    "/api/customer-auth/:path*",
    "/api/orders/:path*",
  ],
};