import { NextResponse } from "next/server";
import {
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

type UpdateStatusBody = {
  orderId?: string;
  status?: string;
};

const ALLOWED_STATUSES = new Set([
  "pending",
  "approved",
  "processing",
  "completed",
  "cancelled",
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

    const body = (await req.json()) as UpdateStatusBody;
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
    const headers = Array.isArray(rows[0]) ? rows[0].map((cell) => String(cell || "").trim()) : [];

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
    const currentOrder = buildRowObject(headers, currentRow);
    const now = new Date().toISOString();

    const updatedRow = headers.map((header) => {
      switch (header) {
        case "id":
          return normalizeText(currentOrder.id);
        case "order_number":
          return normalizeText(currentOrder.order_number);
        case "customer_id":
          return normalizeText(currentOrder.customer_id);
        case "company_name":
          return normalizeText(currentOrder.company_name);
        case "status":
          return status;
        case "subtotal":
          return normalizeText(currentOrder.subtotal);
        case "currency":
          return normalizeText(currentOrder.currency || "USD") || "USD";
        case "notes":
          return normalizeText(currentOrder.notes);
        case "created_at":
          return normalizeText(currentOrder.created_at);
        case "updated_at":
          return now;
        default:
          return normalizeText(currentOrder[header]);
      }
    });

    await updateSheetRowByRowNumber("orders", rowIndex + 1, updatedRow);

    return NextResponse.json({
      ok: true,
      message: "Order status updated successfully.",
      order: {
        id: normalizeText(currentOrder.id),
        orderNumber: normalizeText(currentOrder.order_number),
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