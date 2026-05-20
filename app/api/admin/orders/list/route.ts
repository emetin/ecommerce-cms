import { createSupabaseAdminClient } from "../../../../../lib/supabase/admin";
import {
  jsonError,
  jsonOk,
  requireAdminFromRequest,
} from "../../../../../lib/api/admin";

type OrderRow = {
  id: string;
  order_number: string | null;
  customer_company_id: string | null;
  customer_user_id: string | null;
  status: string | null;
  payment_status: string | null;
  fulfillment_status: string | null;
  currency: string | null;
  subtotal: number | string | null;
  discount_total: number | string | null;
  shipping_total: number | string | null;
  tax_total: number | string | null;
  grand_total: number | string | null;
  notes: string | null;
  customer_snapshot_json: Record<string, unknown> | null;
  shipping_address_json: Record<string, unknown> | null;
  meta_json: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizePage(value: unknown) {
  const number = Number(value || 1);

  if (!Number.isFinite(number) || number <= 0) {
    return 1;
  }

  return Math.floor(number);
}

function normalizeLimit(value: unknown) {
  const number = Number(value || 25);

  if (!Number.isFinite(number) || number <= 0) {
    return 25;
  }

  return Math.min(Math.floor(number), 100);
}

function getJsonValue(
  source: Record<string, unknown> | null | undefined,
  key: string
) {
  return normalizeText(source?.[key]);
}

function mapOrder(row: OrderRow) {
  const customer = row.customer_snapshot_json || {};
  const shipping = row.shipping_address_json || {};
  const meta = row.meta_json || {};

  const firstName =
    getJsonValue(customer, "first_name") || getJsonValue(shipping, "first_name");

  const lastName =
    getJsonValue(customer, "last_name") || getJsonValue(shipping, "last_name");

  const email = getJsonValue(customer, "email");
  const company =
    getJsonValue(customer, "company") ||
    getJsonValue(customer, "company_name") ||
    getJsonValue(shipping, "company");

  const phone =
    getJsonValue(customer, "phone") || getJsonValue(shipping, "phone");

  const country = getJsonValue(shipping, "country");
  const city = getJsonValue(shipping, "city");

  return {
    id: normalizeText(row.id),
    order_number: normalizeText(row.order_number),
    cart_id: getJsonValue(meta, "cart_id"),
    customer_id:
      normalizeText(row.customer_company_id) ||
      normalizeText(row.customer_user_id),
    customer_company_id: normalizeText(row.customer_company_id),
    customer_user_id: normalizeText(row.customer_user_id),

    email: normalizeLower(email),
    first_name: firstName,
    last_name: lastName,
    company_name: company,
    phone,

    country,
    city,
    address_line_1: getJsonValue(shipping, "address_line_1"),
    address_line_2: getJsonValue(shipping, "address_line_2"),
    postal_code: getJsonValue(shipping, "postal_code"),

    status: normalizeLower(row.status || "submitted") || "submitted",
    payment_status:
      normalizeLower(row.payment_status || "pending") || "pending",
    fulfillment_status:
      normalizeLower(row.fulfillment_status || "unfulfilled") || "unfulfilled",

    currency: normalizeText(row.currency || "USD") || "USD",

    subtotal: toNumber(row.subtotal),
    discount_total: toNumber(row.discount_total),
    shipping_total: toNumber(row.shipping_total),
    tax_total: toNumber(row.tax_total),
    grand_total: toNumber(row.grand_total),
    item_count: toNumber(meta.item_count),

    notes: normalizeText(row.notes),
    created_at: normalizeText(row.created_at),
    updated_at: normalizeText(row.updated_at),
  };
}

export async function GET(req: Request) {
  try {
    await requireAdminFromRequest(req);

    const url = new URL(req.url);
    const supabase = createSupabaseAdminClient();

    const page = normalizePage(url.searchParams.get("page"));
    const limit = normalizeLimit(url.searchParams.get("limit"));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const statusFilter = normalizeLower(url.searchParams.get("status"));
    const paymentFilter = normalizeLower(url.searchParams.get("payment_status"));
    const fulfillmentFilter = normalizeLower(
      url.searchParams.get("fulfillment_status")
    );
    const searchQuery = normalizeText(url.searchParams.get("q"));

    let query = supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        customer_company_id,
        customer_user_id,
        status,
        payment_status,
        fulfillment_status,
        currency,
        subtotal,
        discount_total,
        shipping_total,
        tax_total,
        grand_total,
        notes,
        customer_snapshot_json,
        shipping_address_json,
        meta_json,
        created_at,
        updated_at
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (paymentFilter && paymentFilter !== "all") {
      query = query.eq("payment_status", paymentFilter);
    }

    if (fulfillmentFilter && fulfillmentFilter !== "all") {
      query = query.eq("fulfillment_status", fulfillmentFilter);
    }

    if (searchQuery) {
      const safeQuery = searchQuery.replace(/[%]/g, "");
      query = query.or(
        [
          `order_number.ilike.%${safeQuery}%`,
          `status.ilike.%${safeQuery}%`,
          `payment_status.ilike.%${safeQuery}%`,
          `fulfillment_status.ilike.%${safeQuery}%`,
          `customer_snapshot_json->>email.ilike.%${safeQuery}%`,
          `customer_snapshot_json->>company.ilike.%${safeQuery}%`,
          `customer_snapshot_json->>first_name.ilike.%${safeQuery}%`,
          `customer_snapshot_json->>last_name.ilike.%${safeQuery}%`,
          `customer_snapshot_json->>phone.ilike.%${safeQuery}%`,
          `shipping_address_json->>city.ilike.%${safeQuery}%`,
          `shipping_address_json->>country.ilike.%${safeQuery}%`,
        ].join(",")
      );
    }

    const { data, count, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const items = ((data || []) as OrderRow[]).map(mapOrder);

    return jsonOk(
      {
        total,
        page,
        limit,
        totalPages,
        items,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    return jsonError(error, "Failed to load orders.");
  }
}