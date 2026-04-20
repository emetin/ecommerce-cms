import { NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../../../lib/customer-auth";
import { getOrdersForCustomer } from "../../../../lib/account-orders";

function getCookieValue(cookieHeader: string, name: string) {
  const match = cookieHeader.match(
    new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionToken = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const session = await readCustomerFromSessionToken(sessionToken);

    if (!session?.customerId && !session?.email) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const orders = await getOrdersForCustomer({
      customerId: session?.customerId || "",
      email: session?.email || "",
    });

    return NextResponse.json({
      ok: true,
      orders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load orders.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}