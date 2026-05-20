import { NextResponse } from "next/server";
import { getAdminOrderDetail } from "../../../../../lib/admin-orders";

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orderNumber = String(url.searchParams.get("order_number") || "").trim();

    if (!orderNumber) {
      return jsonError("order_number is required.", 400);
    }

    const detail = await getAdminOrderDetail(orderNumber);

    if (!detail) {
      return jsonError("Order not found.", 404);
    }

    return NextResponse.json({
      ok: true,
      order: detail.order,
      items: detail.items,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load order detail."
    );
  }
}