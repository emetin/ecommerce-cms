import { NextResponse } from "next/server";
import { getSheetData } from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

type CustomerRow = {
  id?: string;
  email?: string;
  password_hash?: string;

  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
  country?: string;
  city?: string;
  address_line_1?: string;
  address_line_2?: string;
  postal_code?: string;

  status?: string;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
  tax_exempt?: string;
  approved_at?: string;

  // legacy fallback
  company_name?: string;
  contact_name?: string;
  customer_code?: string;
  price_tier?: string;
  currency?: string;
  shipping_terms?: string;
  payment_terms?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function buildFullName(row: CustomerRow) {
  const first = normalizeText(row.first_name);
  const last = normalizeText(row.last_name);
  const full = [first, last].filter(Boolean).join(" ").trim();

  return full || normalizeText(row.contact_name);
}

function buildCompany(row: CustomerRow) {
  return normalizeText(row.company) || normalizeText(row.company_name);
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
        full_name: buildFullName(row),
        first_name: normalizeText(row.first_name),
        last_name: normalizeText(row.last_name),
        company: buildCompany(row),
        email: normalizeText(row.email),
        phone: normalizeText(row.phone),
        country: normalizeText(row.country),
        city: normalizeText(row.city),
        address_line_1: normalizeText(row.address_line_1),
        address_line_2: normalizeText(row.address_line_2),
        postal_code: normalizeText(row.postal_code),
        status: normalizeText(row.status || "inactive") || "inactive",
        price_tier: normalizeText(row.price_tier || "standard") || "standard",
        currency: normalizeText(row.currency || "USD") || "USD",
        customer_code: normalizeText(row.customer_code),
        tax_exempt: normalizeText(row.tax_exempt),
        approved_at: normalizeText(row.approved_at),
        created_at: normalizeText(row.created_at),
        updated_at: normalizeText(row.updated_at),
        last_login_at: normalizeText(row.last_login_at),
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