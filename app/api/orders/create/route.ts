import { NextResponse } from "next/server";
import { appendSheetRow, appendSheetRows } from "../../../../lib/sheets";
import { readCustomerFromSessionToken } from "../../../../lib/customer-auth";

type OrderItemInput = {
  productSlug?: string;
  productTitle?: string;
  variantId?: string;
  variantLabel?: string;
  sku?: string;
  image?: string;
  unitPrice?: number;
  quantity?: number;
  minOrderQuantity?: number;
  quantityStep?: number;
  lineTotal?: number;
};

type CreateOrderBody = {
  notes?: string;
  items?: OrderItemInput[];
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function toSafeNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseCustomerTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_customer_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseCustomerTokenFromCookie(cookieHeader);
    const customer = await readCustomerFromSessionToken(token);

    if (!customer) {
      return NextResponse.json(
        { ok: false, error: "Customer session not found." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as CreateOrderBody;
    const notes = normalizeText(body?.notes);
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json(
        { ok: false, error: "At least one item is required." },
        { status: 400 }
      );
    }

    const normalizedItems = items
      .map((item) => {
        const unitPrice = toSafeNumber(item.unitPrice, 0);
        const quantity = Math.max(1, toSafeNumber(item.quantity, 1));
        const lineTotal = unitPrice * quantity;

        return {
          productSlug: normalizeText(item.productSlug),
          productTitle: normalizeText(item.productTitle),
          variantId: normalizeText(item.variantId),
          variantLabel: normalizeText(item.variantLabel),
          sku: normalizeText(item.sku),
          unitPrice,
          quantity,
          lineTotal,
        };
      })
      .filter((item) => item.productSlug && item.productTitle);

    if (!normalizedItems.length) {
      return NextResponse.json(
        { ok: false, error: "No valid order items found." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();
    const orderNumber = `B2B-${Date.now()}`;
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);

    await appendSheetRow("orders", [
      orderId,
      orderNumber,
      customer.customerId,
      customer.companyName,
      "pending",
      String(subtotal),
      customer.currency || "USD",
      notes,
      now,
      now,
    ]);

    await appendSheetRows(
      "order_items",
      normalizedItems.map((item) => [
        crypto.randomUUID(),
        orderId,
        item.productSlug,
        item.variantId,
        item.sku,
        item.productTitle,
        item.variantLabel,
        String(item.quantity),
        String(item.unitPrice),
        String(item.lineTotal),
      ])
    );

    return NextResponse.json({
      ok: true,
      message: "Order submitted successfully.",
      orderId,
      orderNumber,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while creating order.",
      },
      { status: 500 }
    );
  }
}