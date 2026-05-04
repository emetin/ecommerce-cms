import { readAdminSessionToken } from "./admin-auth";
import type { AdminPermission } from "./admin-permissions";

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getAdminSessionFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = parseAdminTokenFromCookie(cookieHeader);

  return readAdminSessionToken(token);
}

export async function requireAdminSession(req: Request) {
  const session = await getAdminSessionFromRequest(req);

  if (!session?.adminUserId) {
    throw new Error("Unauthorized.");
  }

  return session;
}

export async function requireAdminPermission(
  req: Request,
  permission: AdminPermission
) {
  const session = await requireAdminSession(req);

  if (
    session.roleKey !== "super_admin" &&
    !session.permissions.includes(permission)
  ) {
    throw new Error("Forbidden.");
  }

  return session;
}

export function getAdminApiErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "Unauthorized.") {
    return 401;
  }

  if (message === "Forbidden.") {
    return 403;
  }

  if (
    message.includes("not found") ||
    message.includes("Not found") ||
    message.includes("not be found")
  ) {
    return 404;
  }

  if (
    message.includes("required") ||
    message.includes("already exists") ||
    message.includes("Invalid") ||
    message.includes("at least")
  ) {
    return 400;
  }

  return 500;
}

export function getAdminApiErrorMessage(
  error: unknown,
  fallback = "Unknown admin API error."
) {
  return error instanceof Error ? error.message : fallback;
}