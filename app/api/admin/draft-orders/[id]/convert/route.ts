import { NextResponse } from "next/server";
import { convertDraftOrderToOrder } from "../../../../../../lib/draft-orders";
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

export async function POST(req: Request, context: RouteContext) {
  try {
    await requireAdminPermission(req, "draft_orders:write");

    const { id } = await context.params;
    const result = await convertDraftOrderToOrder(id);

    return NextResponse.json({
      ok: true,
      message: "Draft order converted successfully.",
      draft: result.draft,
      order: result.order,
      items: result.items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(
          error,
          "Failed to convert draft order."
        ),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}