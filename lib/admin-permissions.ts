export const ADMIN_PERMISSIONS = [
  "dashboard:read",

  "products:read",
  "products:write",

  "collections:read",
  "collections:write",

  "blog:read",
  "blog:write",

  "media:read",
  "media:write",

  "customers:read",
  "customers:write",

  "customer_applications:read",
  "customer_applications:write",

  "orders:read",
  "orders:write",

  "draft_orders:read",
  "draft_orders:write",

  "abandoned_carts:read",
  "checkout_analytics:read",

  "reports:read",

  "users:read",
  "users:write",

  "roles:read",
  "roles:write",

  "account:password_change",

  "settings:manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  super_admin: [...ADMIN_PERMISSIONS],

  admin: [
    "dashboard:read",

    "products:read",
    "products:write",

    "collections:read",
    "collections:write",

    "blog:read",
    "blog:write",

    "media:read",
    "media:write",

    "customers:read",
    "customers:write",

    "customer_applications:read",
    "customer_applications:write",

    "orders:read",
    "orders:write",

    "draft_orders:read",
    "draft_orders:write",

    "abandoned_carts:read",
    "checkout_analytics:read",

    "reports:read",

    "account:password_change",
  ],

  sales_manager: [
    "dashboard:read",

    "customers:read",
    "customers:write",

    "customer_applications:read",
    "customer_applications:write",

    "orders:read",
    "orders:write",

    "draft_orders:read",
    "draft_orders:write",

    "abandoned_carts:read",
    "checkout_analytics:read",

    "reports:read",

    "account:password_change",
  ],

  sales_staff: [
    "dashboard:read",

    "customers:read",
    "customer_applications:read",

    "orders:read",
    "draft_orders:read",

    "abandoned_carts:read",
    "reports:read",

    "account:password_change",
  ],

  catalog_manager: [
    "dashboard:read",

    "products:read",
    "products:write",

    "collections:read",
    "collections:write",

    "blog:read",
    "blog:write",

    "media:read",
    "media:write",

    "account:password_change",
  ],

  order_manager: [
    "dashboard:read",

    "customers:read",

    "orders:read",
    "orders:write",

    "draft_orders:read",
    "draft_orders:write",

    "abandoned_carts:read",
    "checkout_analytics:read",

    "reports:read",

    "account:password_change",
  ],

  viewer: [
    "dashboard:read",

    "products:read",
    "collections:read",
    "blog:read",
    "media:read",

    "customers:read",
    "customer_applications:read",

    "orders:read",

    "reports:read",

    "account:password_change",
  ],
};

export function normalizePermissionList(value: unknown) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item): item is AdminPermission =>
      ADMIN_PERMISSIONS.includes(item as AdminPermission)
    );
}

export function permissionsToSheetValue(permissions: string[]) {
  return permissions
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => ADMIN_PERMISSIONS.includes(item as AdminPermission))
    .join(",");
}

export function hasPermission(
  permissions: string[] | undefined,
  permission: AdminPermission
) {
  if (!permissions || permissions.length === 0) {
    return false;
  }

  return permissions.includes(permission);
}