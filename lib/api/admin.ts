import {
  ADMIN_COOKIE_NAME,
  readAdminSessionToken,
} from "../admin-auth";

export type AdminApiSession = {
  adminUserId: string;
  email: string;
  name: string;
  roleKey: string;
  permissions: string[];
  mustChangePassword: boolean;
};

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseCookieValue(cookieHeader: string, cookieName: string) {
  const escapedCookieName = escapeRegExp(cookieName);
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${escapedCookieName}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

export async function requireAdminFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = parseCookieValue(cookieHeader, ADMIN_COOKIE_NAME);
  const session = await readAdminSessionToken(token);

  if (!session?.adminUserId) {
    throw new AdminApiError("Unauthorized admin request.", 401);
  }

  return session as AdminApiSession;
}

export function jsonOk<TData extends Record<string, unknown>>(
  data: TData,
  init?: ResponseInit
) {
  return Response.json(
    {
      ok: true,
      ...data,
    },
    init
  );
}

export function jsonError(error: unknown, fallback = "Request failed.") {
  if (error instanceof AdminApiError) {
    return Response.json(
      {
        ok: false,
        error: error.message,
      },
      { status: error.status }
    );
  }

  return Response.json(
    {
      ok: false,
      error: error instanceof Error ? error.message : fallback,
    },
    { status: 500 }
  );
}