import { NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../../../../lib/customer-auth";
import { getOrderDetailForCustomer } from "../../../../../lib/account-orders";

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

export async function GET(
  req: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await context.params;
    const normalizedOrderNumber = normalizeText(orderNumber);

    if (!normalizedOrderNumber) {
      return jsonError("Quote request number is required.", 400);
    }

    const cookieHeader = req.headers.get("cookie") || "";
    const sessionToken = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const session = await readCustomerFromSessionToken(sessionToken);

    if (!session?.customerId && !session?.email) {
      return jsonError("Authentication required.", 401);
    }

    const detail = await getOrderDetailForCustomer({
      orderNumber: normalizedOrderNumber,
      customerId: normalizeText(session?.customerId),
      email: normalizeLower(session?.email),
    });

    if (!detail?.order) {
      return jsonError("Quote request not found.", 404);
    }

    const order = detail.order;
    const items = detail.items || [];

    return NextResponse.json({
      ok: true,
      order: {
        id: normalizeText(order.id),
        order_number: normalizeText(order.order_number),
        status: normalizeText(order.status || "submitted"),
        currency: normalizeText(order.currency || "USD") || "USD",

        subtotal: normalizeNumber(order.subtotal),
        discount_total: normalizeNumber(order.discount_total),
        shipping_total: normalizeNumber(order.shipping_total),
        tax_total: normalizeNumber(order.tax_total),
        grand_total: normalizeNumber(order.grand_total),
        item_count: normalizeNumber(order.item_count),

        first_name: normalizeText(order.first_name),
        last_name: normalizeText(order.last_name),
        company: normalizeText(order.company),
        email: normalizeLower(order.email),
        phone: normalizeText(order.phone),

        country: normalizeText(order.country),
        city: normalizeText(order.city),
        address_line_1: normalizeText(order.address_line_1),
        address_line_2: normalizeText(order.address_line_2),
        postal_code: normalizeText(order.postal_code),

        note: normalizeText(order.note),
        created_at: normalizeText(order.created_at),
        updated_at: normalizeText(order.updated_at),
      },
      items: items.map((item) => ({
        id: normalizeText(item.id),
        order_id: normalizeText(item.order_id),
        product_slug: normalizeText(item.product_slug),
        variant_id: normalizeText(item.variant_id),
        product_title: normalizeText(item.product_title),
        variant_title: normalizeText(item.variant_title),
        sku: normalizeText(item.sku),
        image: normalizeText(item.image),
        quantity: normalizeNumber(item.quantity),
        unit_price: normalizeNumber(item.unit_price),
        compare_at_price: normalizeNumber(item.compare_at_price),
        line_total: normalizeNumber(item.line_total),
      })),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to load quote request.",
      500
    );
  }
}