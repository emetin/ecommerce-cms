import { NextResponse } from "next/server";
import {
  createAdminRole,
  getAdminRoles,
} from "../../../../lib/admin-roles";
import { ADMIN_PERMISSIONS } from "../../../../lib/admin-permissions";
import {
  getAdminApiErrorMessage,
  getAdminApiErrorStatus,
  requireAdminPermission,
} from "../../../../lib/admin-request";

type CreateAdminRoleBody = {
  roleKey?: string;
  name?: string;
  permissions?: string[];
  status?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizePermissionArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .filter((item) =>
      ADMIN_PERMISSIONS.includes(item as (typeof ADMIN_PERMISSIONS)[number])
    );
}

export async function GET(req: Request) {
  try {
    await requireAdminPermission(req, "roles:read");

    const roles = await getAdminRoles();

    return NextResponse.json({
      ok: true,
      items: roles,
      permissions: ADMIN_PERMISSIONS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(error, "Failed to load admin roles."),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminPermission(req, "roles:write");

    const body = (await req.json()) as CreateAdminRoleBody;

    const role = await createAdminRole({
      roleKey: normalizeLower(body.roleKey),
      name: normalizeText(body.name),
      permissions: normalizePermissionArray(body.permissions),
      status: normalizeLower(body.status || "active") || "active",
    });

    return NextResponse.json({
      ok: true,
      message: "Admin role created successfully.",
      role,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(error, "Failed to create admin role."),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}