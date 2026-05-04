import { NextResponse } from "next/server";
import {
  findAdminUserById,
  updateAdminUser,
} from "../../../../../lib/admin-users";
import {
  getAdminApiErrorMessage,
  getAdminApiErrorStatus,
  requireAdminPermission,
} from "../../../../../lib/admin-request";

type UpdateAdminUserBody = {
  name?: string;
  roleKey?: string;
  status?: string;
  mustChangePassword?: boolean;
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

function normalizeOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeLower(value);

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return undefined;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    await requireAdminPermission(req, "users:read");

    const { id } = await context.params;
    const user = await findAdminUserById(id);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Admin user not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(error, "Failed to load admin user."),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await requireAdminPermission(req, "users:write");

    const { id } = await context.params;
    const body = (await req.json()) as UpdateAdminUserBody;

    const mustChangePassword = normalizeOptionalBoolean(
      body.mustChangePassword
    );

    const user = await updateAdminUser(id, {
      name: body.name === undefined ? undefined : normalizeText(body.name),
      roleKey:
        body.roleKey === undefined ? undefined : normalizeLower(body.roleKey),
      status:
        body.status === undefined ? undefined : normalizeLower(body.status),
      mustChangePassword,
    });

    return NextResponse.json({
      ok: true,
      message: "Admin user updated successfully.",
      user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(error, "Failed to update admin user."),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}