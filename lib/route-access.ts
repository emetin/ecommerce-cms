// lib/route-access.ts

export function isPathOrChild(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

/**
 * Admin panel sayfaları
 */
export function isAdminPageRoute(pathname: string) {
  return isPathOrChild(pathname, "/admin");
}

/**
 * Admin giriş ekranı
 */
export function isAdminPortalRoute(pathname: string) {
  return pathname === "/portal-ptx-admin";
}

/**
 * Admin auth route'ları
 */
export function isAdminAuthRoute(pathname: string) {
  return isPathOrChild(pathname, "/api/admin-auth");
}

export function isAllowedAdminAuthRoute(pathname: string) {
  return (
    pathname === "/api/admin-auth/login" ||
    pathname === "/api/admin-auth/logout" ||
    pathname === "/api/admin-auth/csrf"
  );
}

/**
 * Sadece admin tarafından kullanılacak API route'ları
 * Buraya yalnızca yönetim paneli CRUD / upload / import endpoint'lerini koy
 */
const ADMIN_API_BASES = [
  "/api/admin",
  "/api/products",
  "/api/blog",
  "/api/collections",
  "/api/product-images",
  "/api/variants",
  "/api/product-variants",
  "/api/upload",
  "/api/collection-products",
];

export function isProtectedAdminApiRoute(pathname: string) {
  return ADMIN_API_BASES.some((basePath) => isPathOrChild(pathname, basePath));
}

/**
 * Customer portal / account route'ları
 */
export function isCustomerPortalLoginRoute(pathname: string) {
  return pathname === "/portal-login";
}

export function isCustomerAuthRoute(pathname: string) {
  return isPathOrChild(pathname, "/api/customer-auth");
}

export function isAllowedCustomerAuthRoute(pathname: string) {
  return (
    pathname === "/api/customer-auth/login" ||
    pathname === "/api/customer-auth/logout" ||
    pathname === "/api/customer-auth/me"
  );
}

/**
 * Giriş yapmış müşteri için korumalı route'lar
 */
export function isCustomerProtectedRoute(pathname: string) {
  return (
    isPathOrChild(pathname, "/account") ||
    pathname === "/api/orders/my" ||
    pathname.startsWith("/api/orders/my/")
  );
}

/**
 * Public order route'ları
 * - guest create
 * - public order lookup
 */
export function isPublicOrderRoute(pathname: string) {
  if (pathname === "/api/orders/create") return true;

  const isSinglePublicOrderLookup =
    pathname.startsWith("/api/orders/") &&
    pathname !== "/api/orders/my" &&
    !pathname.startsWith("/api/orders/my/") &&
    pathname.split("/").filter(Boolean).length === 3;

  return isSinglePublicOrderLookup;
}

/**
 * Proxy matcher ile birebir uyumlu olması için
 * korunan route'ların listesi burada tutuluyor
 */
export const PROXY_MATCHER = [
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
];