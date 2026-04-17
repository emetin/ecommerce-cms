import { NextResponse } from "next/server";
import {
  createCustomerSessionToken,
  CUSTOMER_COOKIE_NAME,
  getCustomerCookieOptions,
} from "../../../../lib/customer-auth";
import {
  createCustomerAccount,
  sanitizeCustomer,
} from "../../../../lib/customer-account";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const customer = await createCustomerAccount({
      email: normalizeText(body?.email),
      password: normalizeText(body?.password),
      first_name: normalizeText(body?.first_name),
      last_name: normalizeText(body?.last_name),
      company: normalizeText(body?.company),
      phone: normalizeText(body?.phone),
    });

    const token = await createCustomerSessionToken({
      customerId: customer.id,
      email: customer.email,
      companyName: customer.company,
      contactName: [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(" "),
      priceTier: "standard",
      currency: "USD",
    });

    const response = NextResponse.json({
      ok: true,
      message: "Customer account created successfully.",
      customer: sanitizeCustomer(customer),
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
          error instanceof Error ? error.message : "Register request failed.",
      },
      { status: 400 }
    );
  }
}