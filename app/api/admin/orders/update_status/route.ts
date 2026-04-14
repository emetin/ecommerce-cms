import { NextResponse } from "next/server";
import {
  findRowNumberByField,
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

type UpdateStatusBody = {
  orderId?: string;
  status?: string;
};

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

const ALLOWED_STATUSES = ["pending", "approved", "processing", "completed", "cancelled"];

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

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid order status." },
        { status: 400 }
      );
    }

    const rowNumber = await findRowNumberByField("orders", "id", orderId);

    if (!rowNumber) {
      return NextResponse.json(
        { ok: false, error: "Order not found." },
        { status: 404 }
      );
    }

    const allRows = await getSheetRows("orders");
    const headers = allRows[0] || [];
    const row = allRows[rowNumber - 1] || [];

    if (!headers.length || !row.length) {
      return NextResponse.json(
        { ok: false, error: "Order row could not be read." },
        { status: 500 }
      );
    }

    const rowObject = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[String(header).trim()] = String(row[index] || "").trim();
      return acc;
    }, {});

    const updatedAt = new Date().toISOString();

    const updatedRow = [
      normalizeText(rowObject.id),
      normalizeText(rowObject.order_number),
      normalizeText(rowObject.customer_id),
      normalizeText(rowObject.company_name),
      status,
      normalizeText(rowObject.subtotal),
      normalizeText(rowObject.currency || "USD") || "USD",
      normalizeText(rowObject.notes),
      normalizeText(rowObject.created_at),
      updatedAt,
    ];

    await updateSheetRowByRowNumber("orders", rowNumber, updatedRow);

    return NextResponse.json({
      ok: true,
      message: "Order status updated successfully.",
      order: {
        id: normalizeText(rowObject.id),
        orderNumber: normalizeText(rowObject.order_number),
        status,
        updatedAt,
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