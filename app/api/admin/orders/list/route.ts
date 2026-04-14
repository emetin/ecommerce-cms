import { NextResponse } from "next/server";
import { getSheetData } from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

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

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function toSafeNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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

    const rows = (await getSheetData("orders", {
      ttlSeconds: 30,
    })) as OrderRow[];

    const items = rows
      .map((row) => ({
        id: normalizeText(row.id),
        order_number: normalizeText(row.order_number),
        customer_id: normalizeText(row.customer_id),
        company_name: normalizeText(row.company_name),
        status: normalizeText(row.status || "pending") || "pending",
        subtotal: toSafeNumber(row.subtotal, 0),
        currency: normalizeText(row.currency || "USD") || "USD",
        notes: normalizeText(row.notes),
        created_at: normalizeText(row.created_at),
        updated_at: normalizeText(row.updated_at),
      }))
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while loading orders.",
      },
      { status: 500 }
    );
  }
}