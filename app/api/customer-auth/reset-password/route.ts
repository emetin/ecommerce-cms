import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
  isExpired,
  isStrongPassword,
  normalizeEmail,
  verifyResetToken,
} from "../../../../lib/customer-password-reset";
import {
  findLatestResetTokenByEmail,
  markResetTokenUsed,
  updateCustomerPasswordHashByEmail,
} from "../../../../lib/customer-users";
import {
  clearFailedAttempts,
  getClientIdentifier,
  getRateLimitStatus,
  registerFailedAttempt,
} from "../../../../lib/customer-reset-rate-limit";

type ResetPasswordBody = {
  email?: string;
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

    const email = normalizeEmail(body?.email || "");
    const token = String(body?.token || "");
    const newPassword = String(body?.newPassword || "");

    if (!email || !token || !newPassword) {
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

    const resetRecord = await findLatestResetTokenByEmail(email);

    if (!resetRecord) {
      registerFailedAttempt(clientKey);

      return NextResponse.json(
        {
          ok: false,
          error: "Invalid or expired reset link.",
        },
        { status: 400 }
      );
    }

    if (resetRecord.used === "true" || isExpired(resetRecord.expires_at)) {
      registerFailedAttempt(clientKey);

      return NextResponse.json(
        {
          ok: false,
          error: "Invalid or expired reset link.",
        },
        { status: 400 }
      );
    }

    const tokenIsValid = await verifyResetToken(token, resetRecord.token_hash);

    if (!tokenIsValid) {
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

    await updateCustomerPasswordHashByEmail(email, newPasswordHash);
    await markResetTokenUsed(email, resetRecord.created_at);

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