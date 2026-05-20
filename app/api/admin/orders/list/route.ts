import { NextResponse } from "next/server";
import { getAllOrders } from "../../../../../lib/order";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSessionToken,
} from "../../../../../lib/admin-auth";
import { toNumber } from "../../../../../lib/money";

function parseCookieValue(cookieHeader: string, cookieName: string) {
  const escapedCookieName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${escapedCookieName}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function matchesQuery(item: Record<string, unknown>, query: string) {
  if (!query) return true;

  const combined = [
    item.order_number,
    item.email,
    item.first_name,
    item.last_name,
    item.company_name,
    item.phone,
    item.city,
    item.country,
    item.status,
    item.payment_status,
    item.fulfillment_status,
    item.notes,
  ]
    .map((value) => normalizeLower(value))
    .join(" ");

  return combined.includes(query);
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseCookieValue(cookieHeader, ADMIN_COOKIE_NAME);
    const isAdmin = await verifyAdminSessionToken(token);

    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const url = new URL(req.url);

    const statusFilter = normalizeLower(url.searchParams.get("status"));
    const paymentFilter = normalizeLower(url.searchParams.get("payment_status"));
    const fulfillmentFilter = normalizeLower(
      url.searchParams.get("fulfillment_status")
    );
    const searchQuery = normalizeLower(url.searchParams.get("q"));

    const orders = await getAllOrders({
      forceFresh: true,
      ttlSeconds: 0,
    });

    const mappedItems = orders.map((order) => ({
      id: normalizeText(order.id),
      order_number: normalizeText(order.order_number),
      cart_id: normalizeText(order.cart_id),
      customer_id: normalizeText(order.customer_id),
      customer_company_id: normalizeText(order.customer_company_id),
      customer_user_id: normalizeText(order.customer_user_id),

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

      status: normalizeLower(order.status || "submitted") || "submitted",
      payment_status:
        normalizeLower(order.payment_status || "pending") || "pending",
      fulfillment_status:
        normalizeLower(order.fulfillment_status || "unfulfilled") ||
        "unfulfilled",

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

    const items = mappedItems.filter((item) => {
      const matchesStatus = statusFilter
        ? item.status === statusFilter
        : true;

      const matchesPayment = paymentFilter
        ? item.payment_status === paymentFilter
        : true;

      const matchesFulfillment = fulfillmentFilter
        ? item.fulfillment_status === fulfillmentFilter
        : true;

      const matchesSearch = matchesQuery(item, searchQuery);

      return (
        matchesStatus && matchesPayment && matchesFulfillment && matchesSearch
      );
    });

    return NextResponse.json(
      {
        ok: true,
        total: items.length,
        items,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load orders.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}