import { NextResponse } from "next/server";
import { getAllOrders } from "../../../../../lib/order";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";
import { toNumber } from "../../../../../lib/money";

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseAdminTokenFromCookie(cookieHeader);
    const isAdmin = await verifyAdminSessionToken(token);

    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const orders = await getAllOrders();

    const items = orders.map((order) => ({
      id: normalizeText(order.id),
      order_number: normalizeText(order.order_number),
      cart_id: normalizeText(order.cart_id),
      customer_id: normalizeText(order.customer_id),

      email: normalizeEmail(order.email),
      first_name: normalizeText(order.first_name),
      last_name: normalizeText(order.last_name),
      company_name: normalizeText(order.company),
      phone: normalizeText(order.phone),

      country: normalizeText(order.country),
      city: normalizeText(order.city),
      address_line_1: normalizeText(order.address_line_1),
      address_line_2: normalizeText(order.address_line_2),
      postal_code: normalizeText(order.postal_code),

      status: normalizeText(order.status || "submitted"),
      currency: normalizeText(order.currency || "USD") || "USD",

      subtotal: toNumber(order.subtotal),
      discount_total: toNumber(order.discount_total),
      shipping_total: toNumber(order.shipping_total),
      tax_total: toNumber(order.tax_total),
      grand_total: toNumber(order.grand_total),
      item_count: toNumber(order.item_count),

      notes: normalizeText(order.note),
      created_at: normalizeText(order.created_at),
      updated_at: normalizeText(order.updated_at),
    }));

    return NextResponse.json({
      ok: true,
      total: items.length,
      items,
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