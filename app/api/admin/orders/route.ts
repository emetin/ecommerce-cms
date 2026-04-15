import { NextResponse } from "next/server";
import { getAllOrders } from "../../../../lib/order";
import { isAuthenticatedAdmin } from "../../../../lib/admin-auth";

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

    return NextResponse.json({
      ok: true,
      orders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch orders.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}