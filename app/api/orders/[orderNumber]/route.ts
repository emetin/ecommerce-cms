import { NextResponse } from "next/server";
import { getOrderByNumber } from "../../../../lib/order";

type RouteContext = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { orderNumber } = await context.params;
    const normalizedOrderNumber = String(orderNumber || "").trim();

    if (!normalizedOrderNumber) {
      return NextResponse.json(
        { ok: false, error: "orderNumber is required." },
        { status: 400 }
      );
    }

    const result = await getOrderByNumber(normalizedOrderNumber);

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