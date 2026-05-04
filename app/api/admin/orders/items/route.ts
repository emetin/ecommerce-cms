import { NextResponse } from "next/server";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";
import { findSheetItemsByField } from "../../../../../lib/sheets";

type OrderItemRecord = {
  id?: string;
  order_id?: string;
  product_slug?: string;
  variant_id?: string;
  sku?: string;
  product_title?: string;
  variant_title?: string;
  quantity?: string;
  unit_price?: string;
  line_total?: string;
  created_at?: string;
};

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
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

    const { searchParams } = new URL(req.url);
    const orderId = normalizeText(searchParams.get("orderId"));

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId is required." },
        { status: 400 }
      );
    }

    const items = (await findSheetItemsByField(
      "order_items",
      "order_id",
      orderId,
      { forceFresh: true, ttlSeconds: 0 }
    )) as OrderItemRecord[];

    return NextResponse.json({
      ok: true,
      items: items.map((item) => ({
        id: normalizeText(item.id),
        order_id: normalizeText(item.order_id),
        product_slug: normalizeText(item.product_slug),
        variant_id: normalizeText(item.variant_id),
        sku: normalizeText(item.sku),
        product_title: normalizeText(item.product_title),
        variant_label: normalizeText(item.variant_title),
        quantity: toNumber(item.quantity),
        unit_price: toNumber(item.unit_price),
        line_total: toNumber(item.line_total),
        created_at: normalizeText(item.created_at),
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