import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "../../../../../lib/admin-auth";
import { toNumber } from "../../../../../lib/money";
import { findSheetItemsByField } from "../../../../../lib/sheets";

type OrderItemRecord = {
  id: string;
  order_id: string;
  product_slug: string;
  variant_id: string;
  sku: string;
  product_title: string;
  variant_title: string;
  quantity: string;
  unit_price: string;
  line_total: string;
  created_at: string;
};

export async function GET(req: Request) {
  try {
    const allowed = await isAuthenticatedAdmin();

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = String(searchParams.get("orderId") || "").trim();

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId is required." },
        { status: 400 }
      );
    }

    const items = await findSheetItemsByField<OrderItemRecord>(
      "order_items",
      "order_id",
      orderId,
      { forceFresh: true, ttlSeconds: 0 }
    );

    return NextResponse.json({
      ok: true,
      items: items.map((item) => ({
        id: item.id,
        order_id: item.order_id,
        product_slug: item.product_slug,
        variant_id: item.variant_id,
        sku: item.sku,
        product_title: item.product_title,
        variant_label: item.variant_title,
        quantity: toNumber(item.quantity),
        unit_price: toNumber(item.unit_price),
        line_total: toNumber(item.line_total),
        created_at: item.created_at,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load order items.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}