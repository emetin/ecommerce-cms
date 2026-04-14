import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";
import { readCustomerFromSessionToken } from "../../../../lib/customer-auth";

type OrderRow = {
  id?: string;
  order_number?: string;
  customer_id?: string;
  company_name?: string;
  status?: string;
  subtotal?: string;
  currency?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function parseCustomerTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_customer_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function toSafeNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseCustomerTokenFromCookie(cookieHeader);
    const customer = await readCustomerFromSessionToken(token);

    if (!customer) {
      return NextResponse.json(
        { ok: false, error: "Customer session not found." },
        { status: 401 }
      );
    }

    const orders = (await getSheetData("orders", {
      ttlSeconds: 60,
    })) as OrderRow[];

    const customerOrders = orders
      .filter(
        (order) => normalizeLower(order.customer_id) === normalizeLower(customer.customerId)
      )
      .map((order) => ({
        id: normalizeText(order.id),
        orderNumber: normalizeText(order.order_number),
        customerId: normalizeText(order.customer_id),
        companyName: normalizeText(order.company_name),
        status: normalizeText(order.status || "pending") || "pending",
        subtotal: toSafeNumber(order.subtotal, 0),
        currency: normalizeText(order.currency || customer.currency || "USD") || "USD",
        notes: normalizeText(order.notes),
        createdAt: normalizeText(order.created_at),
        updatedAt: normalizeText(order.updated_at),
      }))
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    return NextResponse.json({
      ok: true,
      orders: customerOrders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while fetching order history.",
      },
      { status: 500 }
    );
  }
}