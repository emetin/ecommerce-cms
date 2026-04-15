import { NextResponse } from "next/server";
import { getOrderByNumber, updateOrderStatus } from "../../../../../lib/order";
import { isAuthenticatedAdmin } from "../../../../../lib/admin-auth";

type RouteContext = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const allowed = await isAuthenticatedAdmin();

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { orderNumber } = await context.params;
    const result = await getOrderByNumber(orderNumber);

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Order not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      order: result.order,
      items: result.items,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch order.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const allowed = await isAuthenticatedAdmin();

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { orderNumber } = await context.params;
    const body = await req.json();
    const status = String(body?.status || "").trim();

    if (!status) {
      return NextResponse.json(
        { ok: false, error: "status is required." },
        { status: 400 }
      );
    }

    const result = await updateOrderStatus(orderNumber, status);

    return NextResponse.json({
      ok: true,
      order: result.order,
      items: result.items,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update order.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}