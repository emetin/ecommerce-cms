import { NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../../../lib/customer-auth";

function getCookieValue(cookieHeader: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`${escapedName}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const customer = await readCustomerFromSessionToken(token);

    return NextResponse.json({
      ok: true,
      authenticated: Boolean(customer),
      customer,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        customer: null,
        error:
          error instanceof Error
            ? error.message
            : "Customer session could not be read.",
      },
      { status: 500 }
    );
  }
}