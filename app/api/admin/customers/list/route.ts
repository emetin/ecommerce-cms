import { NextResponse } from "next/server";
import { getSheetData } from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

type CustomerRow = {
  id?: string;
  company_name?: string;
  contact_name?: string;
  email?: string;
  password_hash?: string;
  status?: string;
  customer_code?: string;
  price_tier?: string;
  currency?: string;
  shipping_terms?: string;
  payment_terms?: string;
  tax_exempt?: string;
  approved_at?: string;
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

    const rows = (await getSheetData("customers", {
      ttlSeconds: 30,
    })) as CustomerRow[];

    const items = rows
      .map((row) => ({
        id: normalizeText(row.id),
        company_name: normalizeText(row.company_name),
        contact_name: normalizeText(row.contact_name),
        email: normalizeText(row.email),
        status: normalizeText(row.status || "inactive") || "inactive",
        customer_code: normalizeText(row.customer_code),
        price_tier: normalizeText(row.price_tier || "standard") || "standard",
        currency: normalizeText(row.currency || "USD") || "USD",
        shipping_terms: normalizeText(row.shipping_terms),
        payment_terms: normalizeText(row.payment_terms),
        tax_exempt: normalizeText(row.tax_exempt),
        approved_at: normalizeText(row.approved_at),
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
            : "Unknown error while loading customers.",
      },
      { status: 500 }
    );
  }
}