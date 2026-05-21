import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../../lib/api/admin";
import { createSupabaseAdminClient } from "../../../../../lib/supabase/admin";

type ApplicationRow = {
  id?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  business_type?: string | null;
  tax_id?: string | null;
  website?: string | null;
  notes?: string | null;
  status?: string | null;
  created_at?: string | null;
  approved_at?: string | null;
  reviewed_by?: string | null;
};

const ALLOWED_STATUS = ["pending", "approved", "rejected"];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toApplicationItem(item: ApplicationRow) {
  return {
    id: normalizeText(item.id),
    company_name: normalizeText(item.company_name),
    contact_name: normalizeText(item.contact_name),
    email: normalizeText(item.email),
    phone: normalizeText(item.phone),
    country: normalizeText(item.country),
    business_type: normalizeText(item.business_type),
    tax_id: normalizeText(item.tax_id),
    website: normalizeText(item.website),
    notes: normalizeText(item.notes),
    status: normalizeText(item.status || "pending"),
    created_at: normalizeText(item.created_at),
    approved_at: normalizeText(item.approved_at),
    reviewed_by: normalizeText(item.reviewed_by),
  };
}

export async function GET(req: Request) {
  try {
    await requireAdminFromRequest(req);

    const { searchParams } = new URL(req.url);

    const statusParam = normalizeLower(searchParams.get("status"));
    const q = normalizeLower(searchParams.get("q"));

    if (statusParam && !ALLOWED_STATUS.includes(statusParam)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid status filter.",
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from("customer_applications")
      .select(
        `
        id,
        company_name,
        contact_name,
        email,
        phone,
        country,
        business_type,
        tax_id,
        website,
        notes,
        status,
        created_at,
        approved_at,
        reviewed_by
      `
      )
      .order("created_at", { ascending: false });

    if (statusParam) {
      query = query.eq("status", statusParam);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    let items = ((data || []) as ApplicationRow[]).map(toApplicationItem);

    if (q) {
      items = items.filter((item) =>
        [
          item.company_name,
          item.contact_name,
          item.email,
          item.phone,
          item.country,
          item.business_type,
          item.tax_id,
          item.website,
          item.notes,
          item.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    const summary = items.reduce(
      (acc, item) => {
        if (item.status === "pending") acc.pending += 1;
        if (item.status === "approved") acc.approved += 1;
        if (item.status === "rejected") acc.rejected += 1;

        return acc;
      },
      {
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    );

    return NextResponse.json({
      ok: true,
      total: items.length,
      items,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load applications.",
      },
      { status: 500 }
    );
  }
}