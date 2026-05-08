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

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeNumber(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionToken = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const session = await readCustomerFromSessionToken(sessionToken);

    if (!session?.customerId && !session?.email) {
      return jsonError("Authentication required.", 401);
    }

    const rawOrders = await getOrdersForCustomer({
      customerId: normalizeText(session?.customerId),
      email: normalizeLower(session?.email),
    });

    const orders = rawOrders.map((order) => {
      const subtotal = normalizeNumber(order.subtotal);
      const rawGrandTotal = normalizeNumber(order.grand_total);
      const grandTotal = rawGrandTotal > 0 ? rawGrandTotal : subtotal;

      return {
        id: normalizeText(order.id),
        order_number: normalizeText(order.order_number),
        status: normalizeText(order.status || "submitted"),
        currency: normalizeText(order.currency || "USD") || "USD",
        subtotal,
        grand_total: grandTotal,
        item_count: normalizeNumber(order.item_count),
        company: normalizeText(order.company),
        created_at: normalizeText(order.created_at),
        updated_at: normalizeText(order.updated_at),
      };
    });

    return NextResponse.json({
      ok: true,
      total: orders.length,
      orders,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load quote requests.";

    return jsonError(message, 500);
  }
}