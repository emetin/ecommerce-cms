import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSessionToken,
} from "../../../../../lib/admin-auth";
import { createSupabaseAdminClient } from "../../../../../lib/supabase/admin";

const ALLOWED_STATUSES = new Set([
  "submitted",
  "reviewing",
  "quoted",
  "approved",
  "processing",
  "completed",
  "cancelled",
  "paid",
]);

const ALLOWED_PAYMENT_STATUSES = new Set([
  "pending",
  "awaiting_payment",
  "partially_paid",
  "paid",
  "refunded",
  "cancelled",
]);

const ALLOWED_FULFILLMENT_STATUSES = new Set([
  "unfulfilled",
  "partial",
  "fulfilled",
  "cancelled",
]);

function parseCookieValue(cookieHeader: string, cookieName: string) {
  const escapedCookieName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${escapedCookieName}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function nowIso() {
  return new Date().toISOString();
}

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function validateValue(
  value: string,
  allowed: Set<string>,
  label: string
): string {
  if (!value) return "";

  if (!allowed.has(value)) {
    return `${label} is invalid.`;
  }

  return "";
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseCookieValue(cookieHeader, ADMIN_COOKIE_NAME);
    const isAdmin = await verifyAdminSessionToken(token);

    if (!isAdmin) {
      return jsonError("Unauthorized.", 401);
    }

    const body = await req.json().catch(() => ({}));

    const orderNumber = normalizeText(body?.order_number);
    const status = normalizeLower(body?.status);
    const paymentStatus = normalizeLower(body?.payment_status);
    const fulfillmentStatus = normalizeLower(body?.fulfillment_status);

    if (!orderNumber) {
      return jsonError("order_number is required.", 400);
    }

    const statusError = validateValue(status, ALLOWED_STATUSES, "status");
    if (statusError) return jsonError(statusError, 400);

    const paymentError = validateValue(
      paymentStatus,
      ALLOWED_PAYMENT_STATUSES,
      "payment_status"
    );
    if (paymentError) return jsonError(paymentError, 400);

    const fulfillmentError = validateValue(
      fulfillmentStatus,
      ALLOWED_FULFILLMENT_STATUSES,
      "fulfillment_status"
    );
    if (fulfillmentError) return jsonError(fulfillmentError, 400);

    const supabase = createSupabaseAdminClient();

    const { data: existingOrder, error: loadError } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (loadError) {
      throw new Error(loadError.message);
    }

    if (!existingOrder) {
      return jsonError("Order not found.", 404);
    }

    const subtotal = toNumber(existingOrder.subtotal);

    const discountTotal =
      body?.discount_total === undefined
        ? toNumber(existingOrder.discount_total)
        : toNumber(body.discount_total);

    const shippingTotal =
      body?.shipping_total === undefined
        ? toNumber(existingOrder.shipping_total)
        : toNumber(body.shipping_total);

    const taxTotal =
      body?.tax_total === undefined
        ? toNumber(existingOrder.tax_total)
        : toNumber(body.tax_total);

    const grandTotal = Number(
      (subtotal + shippingTotal + taxTotal - discountTotal).toFixed(2)
    );

    const updatePayload: Record<string, unknown> = {
      discount_total: Number(discountTotal.toFixed(2)),
      shipping_total: Number(shippingTotal.toFixed(2)),
      tax_total: Number(taxTotal.toFixed(2)),
      grand_total: grandTotal,
      updated_at: nowIso(),
    };

    if (status) {
      updatePayload.status = status;
    }

    if (paymentStatus) {
      updatePayload.payment_status = paymentStatus;
    }

    if (fulfillmentStatus) {
      updatePayload.fulfillment_status = fulfillmentStatus;
    }

    if (body?.internal_notes !== undefined) {
      updatePayload.internal_notes =
        normalizeText(body.internal_notes) || null;
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("order_number", orderNumber)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Order updated successfully.",
      order: {
        id: updatedOrder.id,
        order_number: updatedOrder.order_number,
        status: updatedOrder.status,
        payment_status: updatedOrder.payment_status,
        fulfillment_status: updatedOrder.fulfillment_status,
        subtotal: toNumber(updatedOrder.subtotal),
        discount_total: toNumber(updatedOrder.discount_total),
        shipping_total: toNumber(updatedOrder.shipping_total),
        tax_total: toNumber(updatedOrder.tax_total),
        grand_total: toNumber(updatedOrder.grand_total),
        updated_at: updatedOrder.updated_at,
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to update order."
    );
  }
}