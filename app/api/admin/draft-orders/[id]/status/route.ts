import { NextResponse } from "next/server";
import { updateDraftOrderStatus } from "../../../../../../lib/draft-orders";
import {
  getAdminApiErrorMessage,
  getAdminApiErrorStatus,
  requireAdminPermission,
} from "../../../../../../lib/admin-request";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateStatusBody = {
  status?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function POST(req: Request, context: RouteContext) {
  try {
    await requireAdminPermission(req, "draft_orders:write");

    const { id } = await context.params;
    const body = (await req.json()) as UpdateStatusBody;
    const status = normalizeLower(body.status);

    if (!status) {
      return NextResponse.json(
        { ok: false, error: "status is required." },
        { status: 400 }
      );
    }

    const result = await updateDraftOrderStatus(id, status);

    return NextResponse.json({
      ok: true,
      message: "Draft order status updated successfully.",
      draft: result.draft,
      items: result.items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(
          error,
          "Failed to update draft order status."
        ),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}