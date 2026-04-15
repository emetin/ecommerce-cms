import { NextResponse } from "next/server";
import { getAllOrders } from "../../../../../lib/order";
import { isAuthenticatedAdmin } from "../../../../../lib/admin-auth";
import { toNumber } from "../../../../../lib/money";

export async function GET() {
  try {
    const allowed = await isAuthenticatedAdmin();

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const orders = await getAllOrders();

    const items = orders.map((order) => ({
      id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id || "",
      company_name: order.company || "",
      status: order.status || "pending",
      subtotal: toNumber(order.subtotal),
      currency: order.currency || "USD",
      notes: order.note || "",
      created_at: order.created_at || "",
      updated_at: order.updated_at || "",
    }));

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load orders.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}