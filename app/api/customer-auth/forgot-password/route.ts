import { NextResponse } from "next/server";
import {
  buildCustomerResetUrl,
  createResetExpiryIso,
  generateRawResetToken,
  normalizeEmail,
} from "../../../../lib/customer-password-reset";
import { sendCustomerPasswordResetEmail } from "../../../../lib/customer-mail";
import {
  findCustomerByEmail,
  setCustomerResetTokenByEmail,
} from "../../../../lib/customer-users";
import {
  clearFailedAttempts,
  getClientIdentifier,
  getRateLimitStatus,
  registerFailedAttempt,
} from "../../../../lib/customer-reset-rate-limit";

type ForgotPasswordBody = {
  email?: string;
};

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for this email, a password reset link has been sent.";

export async function POST(req: Request) {
  const clientKey = `customer-forgot-password:${getClientIdentifier(req)}`;
  const rateLimitStatus = getRateLimitStatus(clientKey);

  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      {
        ok: true,
        message: GENERIC_SUCCESS_MESSAGE,
      },
      {
        status: 200,
        headers: {
          "Retry-After": String(rateLimitStatus.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const body = (await req.json()) as ForgotPasswordBody;
    const email = normalizeEmail(body?.email || "");

    if (!email) {
      registerFailedAttempt(clientKey);

      return NextResponse.json(
        {
          ok: true,
          message: GENERIC_SUCCESS_MESSAGE,
        },
        { status: 200 }
      );
    }

    const customer = await findCustomerByEmail(email);

    if (customer && customer.status.toLowerCase() === "active") {
      const rawToken = generateRawResetToken();
      const expiresAt = createResetExpiryIso();

      await setCustomerResetTokenByEmail(email, rawToken, expiresAt);

      const resetUrl = buildCustomerResetUrl(rawToken, email);

      await sendCustomerPasswordResetEmail({
        to: email,
        resetUrl,
      });

      clearFailedAttempts(clientKey);
    } else {
      registerFailedAttempt(clientKey);
    }

    return NextResponse.json(
      {
        ok: true,
        message: GENERIC_SUCCESS_MESSAGE,
      },
      { status: 200 }
    );
  } catch {
    registerFailedAttempt(clientKey);

    return NextResponse.json(
      {
        ok: true,
        message: GENERIC_SUCCESS_MESSAGE,
      },
      { status: 200 }
    );
  }
}