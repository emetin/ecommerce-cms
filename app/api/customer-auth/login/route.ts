import { NextResponse } from "next/server";
import {
  createCustomerSessionToken,
  CUSTOMER_COOKIE_NAME,
  getCustomerCookieOptions,
  verifyCustomerCredentials,
} from "../../../../lib/customer-auth";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = normalizeText(body?.email).toLowerCase();
    const password = normalizeText(body?.password);

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { ok: false, error: "Password is required." },
        { status: 400 }
      );
    }

    const customer = await verifyCustomerCredentials(email, password);

    if (!customer) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid email, password, or inactive customer account.",
        },
        { status: 401 }
      );
    }

    const token = await createCustomerSessionToken({
      customerId: customer.id,
      customerUserId: customer.customerUserId,
      companyId: customer.companyId,
      email: customer.email,
      companyName: customer.companyName,
      contactName: customer.contactName,
      priceTier: customer.priceTier,
      currency: customer.currency,
      mustChangePassword: customer.mustChangePassword,
    });

    const response = NextResponse.json({
      ok: true,
      message: "Login successful.",
      customer: {
        customerId: customer.id,
        customerUserId: customer.customerUserId,
        companyId: customer.companyId,
        email: customer.email,
        companyName: customer.companyName,
        contactName: customer.contactName,
        priceTier: customer.priceTier,
        currency: customer.currency,
        mustChangePassword: customer.mustChangePassword,
      },
      next_path: customer.mustChangePassword ? "/change-password" : "/account",
    });

    response.cookies.set({
      name: CUSTOMER_COOKIE_NAME,
      value: token,
      ...getCustomerCookieOptions(),
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Login request failed.",
      },
      { status: 500 }
    );
  }
}