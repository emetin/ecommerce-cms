import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
  isExpired,
  isStrongPassword,
} from "../../../../lib/customer-password-reset";
import {
  findCustomerByResetToken,
  updateCustomerPasswordHashByEmail,
} from "../../../../lib/customer-users";
import {
  clearFailedAttempts,
  getClientIdentifier,
  getRateLimitStatus,
  registerFailedAttempt,
} from "../../../../lib/customer-reset-rate-limit";

type ResetPasswordBody = {
  token?: string;
  newPassword?: string;
};

export async function POST(req: Request) {
  const clientKey = `customer-reset-password:${getClientIdentifier(req)}`;
  const rateLimitStatus = getRateLimitStatus(clientKey);

  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many attempts. Please try again in ${rateLimitStatus.retryAfterSeconds} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitStatus.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const body = (await req.json()) as ResetPasswordBody;

    const token = String(body?.token || "").trim();
    const newPassword = String(body?.newPassword || "");

    if (!token || !newPassword) {
      registerFailedAttempt(clientKey);

      return NextResponse.json(
        {
          ok: false,
          error: "Missing required fields.",
        },
        { status: 400 }
      );
    }

    if (!isStrongPassword(newPassword)) {
      registerFailedAttempt(clientKey);

      return NextResponse.json(
        {
          ok: false,
          error:
            "Password must be at least 10 characters long and include uppercase, lowercase, number, and special character.",
        },
        { status: 400 }
      );
    }

    const customer = await findCustomerByResetToken(token);

    if (!customer) {
      registerFailedAttempt(clientKey);

      return NextResponse.json(
        {
          ok: false,
          error: "Invalid or expired reset link.",
        },
        { status: 400 }
      );
    }

    if (
      !customer.reset_token_expires_at ||
      isExpired(customer.reset_token_expires_at)
    ) {
      registerFailedAttempt(clientKey);

      return NextResponse.json(
        {
          ok: false,
          error: "Invalid or expired reset link.",
        },
        { status: 400 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await updateCustomerPasswordHashByEmail(
      customer.email,
      newPasswordHash
    );

    clearFailedAttempts(clientKey);

    return NextResponse.json({
      ok: true,
      message: "Your password has been updated successfully.",
    });
  } catch (error) {
    registerFailedAttempt(clientKey);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "An unknown error occurred.",
      },
      { status: 500 }
    );
  }
}