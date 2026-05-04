import { NextResponse } from "next/server";
import { getSheetData } from "../../../../../lib/sheets";
import {
  getAdminApiErrorMessage,
  getAdminApiErrorStatus,
  requireAdminPermission,
} from "../../../../../lib/admin-request";

type CustomerRecord = {
  id?: string;
  company_name?: string;
  contact_name?: string;
  email?: string;
  customer_code?: string;
  price_tier?: string;
  currency?: string;
  status?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function GET(req: Request) {
  try {
    await requireAdminPermission(req, "draft_orders:read");

    const { searchParams } = new URL(req.url);
    const query = normalizeLower(searchParams.get("q"));

    const rows = (await getSheetData("customers", {
      forceFresh: true,
      ttlSeconds: 0,
    })) as CustomerRecord[];

    const activeRows = rows.filter((customer) => {
      const status = normalizeLower(customer.status || "active");
      return status !== "inactive";
    });

    const filteredRows = activeRows.filter((customer) => {
      if (!query) return true;

      const haystack = [
        customer.id,
        customer.company_name,
        customer.contact_name,
        customer.email,
        customer.customer_code,
        customer.price_tier,
      ]
        .map(normalizeLower)
        .join(" ");

      return haystack.includes(query);
    });

    const items = filteredRows.slice(0, 20).map((customer) => ({
      id: normalizeText(customer.id),
      company_name: normalizeText(customer.company_name),
      contact_name: normalizeText(customer.contact_name),
      email: normalizeLower(customer.email),
      customer_code: normalizeText(customer.customer_code),
      price_tier: normalizeText(customer.price_tier || "standard") || "standard",
      currency: normalizeText(customer.currency || "USD") || "USD",
      status: normalizeText(customer.status || "active") || "active",
    }));

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(
          error,
          "Failed to search customers."
        ),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}