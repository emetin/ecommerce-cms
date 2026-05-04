import { NextResponse } from "next/server";
import {
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

type UpdateOrderStatusBody = {
  orderId?: string;
  status?: string;
};

const ALLOWED_STATUSES = new Set([
  "submitted",
  "reviewing",
  "quoted",
  "approved",
  "processing",
  "completed",
  "cancelled",
  "paid",
]);

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function buildRowObject(headers: string[], row: unknown[]) {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    acc[String(header || "").trim()] = normalizeText(row[index]);
    return acc;
  }, {});
}

export async function POST(req: Request) {
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

    const body = (await req.json()) as UpdateOrderStatusBody;
    const orderId = normalizeText(body?.orderId);
    const status = normalizeLower(body?.status);

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId is required." },
        { status: 400 }
      );
    }

    if (!status || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid order status." },
        { status: 400 }
      );
    }

    const rows = await getSheetRows("orders");
    const headers = Array.isArray(rows[0])
      ? rows[0].map((cell) => String(cell || "").trim())
      : [];

    if (!headers.length) {
      return NextResponse.json(
        { ok: false, error: "orders sheet headers could not be read." },
        { status: 500 }
      );
    }

    const rowIndex = rows.findIndex((row, index) => {
      if (index === 0 || !Array.isArray(row)) return false;

      const rowObject = buildRowObject(headers, row);
      return normalizeText(rowObject.id) === orderId;
    });

    if (rowIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "Order not found." },
        { status: 404 }
      );
    }

    const currentRow = rows[rowIndex] as unknown[];
    const order = buildRowObject(headers, currentRow);
    const now = new Date().toISOString();

    const updatedRow = headers.map((header) => {
      switch (header) {
        case "status":
          return status;

        case "updated_at":
          return now;

        case "email":
          return normalizeText(order.email).toLowerCase();

        case "currency":
          return normalizeText(order.currency || "USD") || "USD";

        default:
          return normalizeText(order[header]);
      }
    });

    await updateSheetRowByRowNumber("orders", rowIndex + 1, updatedRow);

    return NextResponse.json({
      ok: true,
      message: "Order status updated successfully.",
      order: {
        id: normalizeText(order.id),
        orderNumber: normalizeText(order.order_number),
        customerId: normalizeText(order.customer_id),
        company: normalizeText(order.company),
        email: normalizeText(order.email).toLowerCase(),
        status,
        updatedAt: now,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while updating order status.",
      },
      { status: 500 }
    );
  }
}