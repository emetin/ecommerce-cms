import { NextResponse } from "next/server";
import {
  updateAdminUserPassword,
  verifyAdminUserCredentials,
} from "../../../../lib/admin-users";
import { getRolePermissions } from "../../../../lib/admin-roles";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminCookieOptions,
} from "../../../../lib/admin-auth";
import {
  getAdminApiErrorMessage,
  getAdminApiErrorStatus,
  requireAdminSession,
} from "../../../../lib/admin-request";

type ChangePasswordBody = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession(req);

    const body = (await req.json()) as ChangePasswordBody;

    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!currentPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: "Current password is required.",
        },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: "New password is required.",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: "New password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: "New password and confirmation do not match.",
        },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: "New password must be different from the current password.",
        },
        { status: 400 }
      );
    }

    const verifiedUser = await verifyAdminUserCredentials(
      session.email,
      currentPassword
    );

    if (!verifiedUser) {
      return NextResponse.json(
        {
          ok: false,
          error: "Current password is incorrect.",
        },
        { status: 401 }
      );
    }

    const updatedUser = await updateAdminUserPassword(
      session.adminUserId,
      newPassword,
      false
    );

    const permissions = await getRolePermissions(updatedUser.roleKey);

    const newSessionToken = await createAdminSessionToken({
      ...updatedUser,
      permissions,
      mustChangePassword: false,
    });

    const response = NextResponse.json({
      ok: true,
      message: "Password changed successfully.",
      nextPath: "/admin",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        roleKey: updatedUser.roleKey,
        status: updatedUser.status,
        mustChangePassword: false,
      },
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: newSessionToken,
      ...getAdminCookieOptions(),
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(error, "Failed to change password."),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}