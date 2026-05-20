import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSessionToken,
} from "../../../../../lib/admin-auth";
import { createSupabaseAdminClient } from "../../../../../lib/supabase/admin";

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

function toNumber(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getMetaValue(
  meta: Record<string, unknown> | null | undefined,
  key: string
) {
  return normalizeText(meta?.[key]);
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

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseCookieValue(cookieHeader, ADMIN_COOKIE_NAME);
    const isAdmin = await verifyAdminSessionToken(token);

    if (!isAdmin) {
      return jsonError("Unauthorized.", 401);
    }

    const { searchParams } = new URL(req.url);

    const orderId = normalizeText(searchParams.get("orderId"));
    const orderNumber = normalizeText(searchParams.get("orderNumber"));

    if (!orderId && !orderNumber) {
      return jsonError("orderId or orderNumber is required.", 400);
    }

    const supabase = createSupabaseAdminClient();

    let resolvedOrderId = orderId;

    if (!resolvedOrderId && orderNumber) {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id")
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (orderError) {
        throw new Error(orderError.message);
      }

      if (!orderData?.id) {
        return jsonError("Order not found.", 404);
      }

      resolvedOrderId = normalizeText(orderData.id);
    }

    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", resolvedOrderId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const items = (data || []).map((item) => {
      const meta = item.meta_json || {};
      const snapshot = item.product_snapshot_json || {};

      return {
        id: normalizeText(item.id),
        order_id: normalizeText(item.order_id),

        product_id: normalizeText(item.product_id),
        product_slug:
          getMetaValue(meta, "product_slug") ||
          getMetaValue(snapshot, "product_slug"),

        variant_id: normalizeText(item.variant_id),
        sku: normalizeText(item.sku),

        product_title:
          normalizeText(item.product_title) ||
          getMetaValue(snapshot, "product_title"),

        variant_label:
          normalizeText(item.variant_title) ||
          getMetaValue(snapshot, "variant_title"),

        image: getMetaValue(snapshot, "image") || getMetaValue(meta, "image"),

        box_quantity: toNumber(item.box_quantity),
        quantity: toNumber(item.quantity),
        unit_price: toNumber(item.unit_price),
        line_total: toNumber(item.line_total),

        created_at: normalizeText(item.created_at),
      };
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
      error instanceof Error ? error.message : "Failed to load order items.";

    return jsonError(message, 500);
  }
}