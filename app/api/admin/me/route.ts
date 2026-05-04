import { NextResponse } from "next/server";
import {
  getAdminApiErrorMessage,
  getAdminApiErrorStatus,
  requireAdminSession,
} from "../../../../lib/admin-request";

export async function GET(req: Request) {
  try {
    const session = await requireAdminSession(req);

    return NextResponse.json({
      ok: true,
      admin: {
        id: session.adminUserId,
        email: session.email,
        name: session.name,
        roleKey: session.roleKey,
        permissions: session.permissions,
        mustChangePassword: session.mustChangePassword,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(error, "Failed to load admin session."),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}