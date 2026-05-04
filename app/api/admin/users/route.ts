import { NextResponse } from "next/server";
import {
  createAdminUser,
  getAdminUsers,
} from "../../../../lib/admin-users";
import {
  getAdminApiErrorMessage,
  getAdminApiErrorStatus,
  requireAdminPermission,
} from "../../../../lib/admin-request";

type CreateAdminUserBody = {
  email?: string;
  name?: string;
  password?: string;
  roleKey?: string;
  status?: string;
  mustChangePassword?: boolean;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeBoolean(value: unknown, fallback = false) {
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

  return fallback;
}

export async function GET(req: Request) {
  try {
    await requireAdminPermission(req, "users:read");

    const users = await getAdminUsers();

    return NextResponse.json({
      ok: true,
      items: users,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(error, "Failed to load admin users."),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminPermission(req, "users:write");

    const body = (await req.json()) as CreateAdminUserBody;

    const user = await createAdminUser({
      email: normalizeLower(body.email),
      name: normalizeText(body.name),
      password: String(body.password || ""),
      roleKey: normalizeLower(body.roleKey || "viewer") || "viewer",
      status: normalizeLower(body.status || "active") || "active",
      mustChangePassword: normalizeBoolean(body.mustChangePassword, true),
    });

    return NextResponse.json({
      ok: true,
      message: "Admin user created successfully.",
      user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(error, "Failed to create admin user."),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}