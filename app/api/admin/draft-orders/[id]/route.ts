import { NextResponse } from "next/server";
import {
  getDraftOrderById,
  updateDraftOrder,
  type UpdateDraftOrderInput,
} from "../../../../../lib/draft-orders";
import {
  getAdminApiErrorMessage,
  getAdminApiErrorStatus,
  requireAdminPermission,
} from "../../../../../lib/admin-request";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateDraftOrderBody = UpdateDraftOrderInput;

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeNumberLike(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value).trim();
}

export async function GET(req: Request, context: RouteContext) {
  try {
    await requireAdminPermission(req, "draft_orders:read");

    const { id } = await context.params;
    const result = await getDraftOrderById(id);

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Draft order not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      draft: result.draft,
      items: result.items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(
          error,
          "Failed to load draft order."
        ),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await requireAdminPermission(req, "draft_orders:write");

    const { id } = await context.params;
    const body = (await req.json()) as UpdateDraftOrderBody;

    const result = await updateDraftOrder(id, {
      customer_id:
        body.customer_id === undefined
          ? undefined
          : normalizeText(body.customer_id),
      email: body.email === undefined ? undefined : normalizeLower(body.email),
      company:
        body.company === undefined ? undefined : normalizeText(body.company),
      contact_name:
        body.contact_name === undefined
          ? undefined
          : normalizeText(body.contact_name),
      status:
        body.status === undefined
          ? undefined
          : normalizeLower(body.status || "draft"),
      currency:
        body.currency === undefined
          ? undefined
          : normalizeText(body.currency || "USD") || "USD",
      discount_total: normalizeNumberLike(body.discount_total),
      shipping_total: normalizeNumberLike(body.shipping_total),
      tax_total: normalizeNumberLike(body.tax_total),
      note: body.note === undefined ? undefined : normalizeText(body.note),
    });

    return NextResponse.json({
      ok: true,
      message: "Draft order updated successfully.",
      draft: result.draft,
      items: result.items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(
          error,
          "Failed to update draft order."
        ),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}