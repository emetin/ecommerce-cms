import { NextResponse } from "next/server";
import { getSheetData } from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

type OrderItemRow = {
  id?: string;
  order_id?: string;
  product_slug?: string;
  variant_id?: string;
  sku?: string;
  product_title?: string;
  variant_label?: string;
  quantity?: string;
  unit_price?: string;
  line_total?: string;
  created_at?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function toSafeNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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

    const rows = (await getSheetData("order_items", {
      ttlSeconds: 30,
    })) as OrderItemRow[];

    const items = rows
      .filter((row) => normalizeText(row.order_id) === orderId)
      .map((row) => ({
        id: normalizeText(row.id),
        order_id: normalizeText(row.order_id),
        product_slug: normalizeText(row.product_slug),
        variant_id: normalizeText(row.variant_id),
        sku: normalizeText(row.sku),
        product_title: normalizeText(row.product_title),
        variant_label: normalizeText(row.variant_label),
        quantity: toSafeNumber(row.quantity, 0),
        unit_price: toSafeNumber(row.unit_price, 0),
        line_total: toSafeNumber(row.line_total, 0),
        created_at: normalizeText(row.created_at),
      }));

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while loading order items.",
      },
      { status: 500 }
    );
  }
}