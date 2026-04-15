import { NextResponse } from "next/server";
import { updateOrderStatus, getAllOrders } from "../../../../../lib/order";
import { isAuthenticatedAdmin } from "../../../../../lib/admin-auth";

export async function POST(req: Request) {
  try {
    const allowed = await isAuthenticatedAdmin();

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const orderId = String(body?.orderId || "").trim();
    const status = String(body?.status || "").trim();

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId is required." },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { ok: false, error: "status is required." },
        { status: 400 }
      );
    }

    const orders = await getAllOrders();
    const order = orders.find((item) => item.id === orderId);

    if (!order?.order_number) {
      return NextResponse.json(
        { ok: false, error: "Order not found." },
        { status: 404 }
      );
    }

    const result = await updateOrderStatus(order.order_number, status);

    return NextResponse.json({
      ok: true,
      order: {
        id: result.order.id,
        orderNumber: result.order.order_number,
        status: result.order.status,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update order status.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}