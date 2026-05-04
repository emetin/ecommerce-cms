import { NextResponse } from "next/server";
import {
  getAdminRoles,
  updateAdminRole,
} from "../../../../../lib/admin-roles";
import { ADMIN_PERMISSIONS } from "../../../../../lib/admin-permissions";
import {
  getAdminApiErrorMessage,
  getAdminApiErrorStatus,
  requireAdminPermission,
} from "../../../../../lib/admin-request";

type UpdateAdminRoleBody = {
  name?: string;
  permissions?: string[];
  status?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizePermissionArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .filter((item) =>
      ADMIN_PERMISSIONS.includes(item as (typeof ADMIN_PERMISSIONS)[number])
    );
}

export async function GET(req: Request, context: RouteContext) {
  try {
    await requireAdminPermission(req, "roles:read");

    const { id } = await context.params;
    const roles = await getAdminRoles();
    const role = roles.find((item) => item.id === id);

    if (!role) {
      return NextResponse.json(
        { ok: false, error: "Admin role not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      role,
      permissions: ADMIN_PERMISSIONS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(error, "Failed to load admin role."),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await requireAdminPermission(req, "roles:write");

    const { id } = await context.params;
    const body = (await req.json()) as UpdateAdminRoleBody;

    const permissions = normalizePermissionArray(body.permissions);

    const role = await updateAdminRole(id, {
      name: body.name === undefined ? undefined : normalizeText(body.name),
      permissions,
      status:
        body.status === undefined ? undefined : normalizeLower(body.status),
    });

    return NextResponse.json({
      ok: true,
      message: "Admin role updated successfully.",
      role,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(error, "Failed to update admin role."),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}