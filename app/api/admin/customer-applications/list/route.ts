import { NextResponse } from "next/server";
import { getSheetData } from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

type ApplicationRow = {
  id?: string;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  business_type?: string;
  tax_id?: string;
  website?: string;
  notes?: string;
  status?: string;
  created_at?: string;
  approved_at?: string;
  reviewed_by?: string;
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

    const rows = (await getSheetData("customer_applications", {
      ttlSeconds: 30,
    })) as ApplicationRow[];

    const items = rows
      .map((row) => ({
        id: normalizeText(row.id),
        company_name: normalizeText(row.company_name),
        contact_name: normalizeText(row.contact_name),
        email: normalizeText(row.email),
        phone: normalizeText(row.phone),
        country: normalizeText(row.country),
        business_type: normalizeText(row.business_type),
        tax_id: normalizeText(row.tax_id),
        website: normalizeText(row.website),
        notes: normalizeText(row.notes),
        status: normalizeText(row.status || "pending") || "pending",
        created_at: normalizeText(row.created_at),
        approved_at: normalizeText(row.approved_at),
        reviewed_by: normalizeText(row.reviewed_by),
      }))
      .sort((a, b) => {
        const aPending = normalizeLower(a.status) === "pending" ? 0 : 1;
        const bPending = normalizeLower(b.status) === "pending" ? 0 : 1;

        if (aPending !== bPending) return aPending - bPending;

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
            : "Unknown error while loading applications.",
      },
      { status: 500 }
    );
  }
}