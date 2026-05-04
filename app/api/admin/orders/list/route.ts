import { NextResponse } from "next/server";
import { getAllOrders } from "../../../../../lib/order";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";
import { toNumber } from "../../../../../lib/money";

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseAdminTokenFromCookie(cookieHeader);
    const isAdmin = await verifyAdminSessionToken(token);

    if (!isAdmin) {
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
      status: order.status || "submitted",
      subtotal: toNumber(order.subtotal),
      grand_total: toNumber(order.grand_total),
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