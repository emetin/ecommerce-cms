import { NextResponse } from "next/server";
import {
  createDraftOrder,
  getAllDraftOrders,
  type CreateDraftOrderInput,
} from "../../../../lib/draft-orders";
import {
  getAdminApiErrorMessage,
  getAdminApiErrorStatus,
  requireAdminPermission,
} from "../../../../lib/admin-request";

type CreateDraftOrderBody = CreateDraftOrderInput;

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeNumberLike(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source = item as Record<string, unknown>;

      return {
        product_slug: normalizeText(source.product_slug),
        variant_id: normalizeText(source.variant_id),
        sku: normalizeText(source.sku),
        product_title: normalizeText(source.product_title),
        variant_title: normalizeText(source.variant_title),
        image: normalizeText(source.image),
        quantity: normalizeNumberLike(source.quantity),
        unit_price: normalizeNumberLike(source.unit_price),
      };
    })
    .filter((item) => item.product_title || item.sku || item.product_slug);
}

export async function GET(req: Request) {
  try {
    await requireAdminPermission(req, "draft_orders:read");

    const items = await getAllDraftOrders();

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(
          error,
          "Failed to load draft orders."
        ),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdminPermission(req, "draft_orders:write");
    const body = (await req.json()) as CreateDraftOrderBody;

    const result = await createDraftOrder({
      customer_id: normalizeText(body.customer_id),
      email: normalizeLower(body.email),
      company: normalizeText(body.company),
      contact_name: normalizeText(body.contact_name),
      status: normalizeLower(body.status || "draft") || "draft",
      currency: normalizeText(body.currency || "USD") || "USD",
      discount_total: normalizeNumberLike(body.discount_total),
      shipping_total: normalizeNumberLike(body.shipping_total),
      tax_total: normalizeNumberLike(body.tax_total),
      note: normalizeText(body.note),
      created_by: session.email || session.name || session.adminUserId,
      items: normalizeItems(body.items),
    });

    return NextResponse.json({
      ok: true,
      message: "Draft order created successfully.",
      draft: result.draft,
      items: result.items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(
          error,
          "Failed to create draft order."
        ),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}