import { NextResponse } from "next/server";
import { updateAdminUserPassword } from "../../../../../../lib/admin-users";
import {
  getAdminApiErrorMessage,
  getAdminApiErrorStatus,
  requireAdminPermission,
} from "../../../../../../lib/admin-request";

type UpdateAdminPasswordBody = {
  password?: string;
  mustChangePassword?: boolean;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeLower(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeBoolean(value: unknown, fallback = true) {
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

export async function POST(req: Request, context: RouteContext) {
  try {
    await requireAdminPermission(req, "users:write");

    const { id } = await context.params;
    const body = (await req.json()) as UpdateAdminPasswordBody;

    const password = String(body.password || "");
    const mustChangePassword = normalizeBoolean(
      body.mustChangePassword,
      true
    );

    const user = await updateAdminUserPassword(
      id,
      password,
      mustChangePassword
    );

    return NextResponse.json({
      ok: true,
      message: "Admin user password updated successfully.",
      user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(
          error,
          "Failed to update admin user password."
        ),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}