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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);

    if (!token) {
      return jsonResponse({
        ok: true,
        authenticated: false,
        customer: null,
      });
    }

    const customer = await readCustomerFromSessionToken(token);

    return jsonResponse({
      ok: true,
      authenticated: Boolean(customer),
      customer,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        authenticated: false,
        customer: null,
        error:
          error instanceof Error
            ? error.message
            : "Customer session could not be read.",
      },
      500
    );
  }
}