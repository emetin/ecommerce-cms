import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../../lib/supabase/admin";
import { requireAdminFromRequest } from "../../../../../lib/api/admin";

type ProductRow = {
  id?: string;
  title?: string | null;
  slug?: string | null;
  status?: string | null;
  base_price?: number | string | null;
  image_url?: string | null;
  image_file_id?: string | null;
  image_alt?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CustomerUserRow = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type CustomerCompanyRow = {
  id?: string;
  company_name?: string | null;
  email?: string | null;
  status?: string | null;
  currency?: string | null;
  created_at?: string | null;
  customer_users?: CustomerUserRow[] | CustomerUserRow | null;
};

type OrderRow = {
  id?: string;
  order_number?: string | null;
  customer_company_id?: string | null;
  customer_user_id?: string | null;
  status?: string | null;
  payment_status?: string | null;
  fulfillment_status?: string | null;
  currency?: string | null;
  subtotal?: number | string | null;
  grand_total?: number | string | null;
  customer_snapshot_json?: Record<string, unknown> | null;
  meta_json?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SupabaseResult = {
  data?: unknown;
  error?: {
    message?: string;
  } | null;
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

function getDateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function sortByCreatedAtDesc<T extends { created_at?: string | null }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

    return bTime - aTime;
  });
}

function normalizeCustomerUsers(value: CustomerCompanyRow["customer_users"]) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value) {
    return [value];
  }

  return [];
}

function buildContactName(company: CustomerCompanyRow) {
  const firstUser = normalizeCustomerUsers(company.customer_users)[0] || null;

  const fullName = [
    normalizeText(firstUser?.first_name),
    normalizeText(firstUser?.last_name),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    normalizeText(firstUser?.email) ||
    normalizeText(company.email) ||
    "-"
  );
}

function getCustomerSnapshotValue(
  order: OrderRow,
  key: string,
  fallback = ""
) {
  return normalizeText(order.customer_snapshot_json?.[key]) || fallback;
}

function mapOrder(order: OrderRow) {
  const companyName =
    getCustomerSnapshotValue(order, "company") ||
    getCustomerSnapshotValue(order, "company_name") ||
    "-";

  return {
    id: normalizeText(order.id),
    order_number: normalizeText(order.order_number),
    customer_id:
      normalizeText(order.customer_company_id) ||
      normalizeText(order.customer_user_id),
    company_name: companyName,
    status: normalizeText(order.status || "submitted") || "submitted",
    subtotal: toNumber(order.subtotal || order.grand_total),
    currency: normalizeText(order.currency || "USD") || "USD",
    created_at: normalizeText(order.created_at),
    updated_at: normalizeText(order.updated_at),
  };
}

async function safeSelect<T>(query: unknown): Promise<T[]> {
  try {
    const result = (await query) as SupabaseResult;

    if (result.error) {
      return [];
    }

    return Array.isArray(result.data) ? (result.data as T[]) : [];
  } catch {
    return [];
  }
}

function buildErrorResponse(error: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load dashboard summary.",
    },
    { status: 500 }
  );
}

export async function GET(req: Request) {
  try {
    await requireAdminFromRequest(req);

    const supabase = createSupabaseAdminClient();
    const thirtyDaysAgo = getDateDaysAgo(30);

    const productsPromise = safeSelect<ProductRow>(
      supabase
        .from("products")
        .select(
          `
          id,
          title,
          slug,
          status,
          base_price,
          image_url,
          image_file_id,
          image_alt,
          seo_title,
          seo_description,
          created_at,
          updated_at
        `
        )
    );

    const customersPromise = safeSelect<CustomerCompanyRow>(
      supabase
        .from("customer_companies")
        .select(
          `
          id,
          company_name,
          email,
          status,
          currency,
          created_at,
          customer_users (
            first_name,
            last_name,
            email
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(20)
    );

    const ordersPromise = safeSelect<OrderRow>(
      supabase
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
          grand_total,
          customer_snapshot_json,
          meta_json,
          created_at,
          updated_at
        `
        )
        .order("created_at", { ascending: false })
        .limit(30)
    );

    const recentOrders30DaysPromise = safeSelect<OrderRow>(
      supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          status,
          currency,
          subtotal,
          grand_total,
          customer_snapshot_json,
          created_at,
          updated_at
        `
        )
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
    );

    const [products, customers, orders, recentOrders30Days] =
      await Promise.all([
        productsPromise,
        customersPromise,
        ordersPromise,
        recentOrders30DaysPromise,
      ]);

    const productTotal = products.length;

    const publishedProducts = products.filter(
      (item) => normalizeLower(item.status) === "published"
    ).length;

    const draftProducts = products.filter(
      (item) => normalizeLower(item.status) === "draft"
    ).length;

    const archivedProducts = products.filter(
      (item) => normalizeLower(item.status) === "archived"
    ).length;

    const missingImageProducts = products.filter((item) => {
      return !normalizeText(item.image_url) && !normalizeText(item.image_file_id);
    }).length;

    const missingPriceProducts = products.filter((item) => {
      return toNumber(item.base_price) <= 0;
    }).length;

    const missingSeoProducts = products.filter((item) => {
      return (
        !normalizeText(item.seo_title) || !normalizeText(item.seo_description)
      );
    }).length;

    const activeCustomers = customers.filter(
      (item) => normalizeLower(item.status) === "active"
    ).length;

    const inactiveCustomers = customers.filter(
      (item) => normalizeLower(item.status) !== "active"
    ).length;

    const pendingOrderStatuses = new Set(["pending", "submitted", "reviewing"]);

    const processingOrderStatuses = new Set([
      "quoted",
      "approved",
      "processing",
    ]);

    const pendingOrders = orders.filter((item) => {
      return pendingOrderStatuses.has(normalizeLower(item.status));
    }).length;

    const processingOrders = orders.filter((item) => {
      return processingOrderStatuses.has(normalizeLower(item.status));
    }).length;

    const completedOrders = orders.filter((item) => {
      return normalizeLower(item.status) === "completed";
    }).length;

    const orderVolume = orders.reduce((sum, item) => {
      return sum + toNumber(item.subtotal || item.grand_total);
    }, 0);

    const monthlyQuoteVolume = recentOrders30Days.reduce((sum, item) => {
      return sum + toNumber(item.subtotal || item.grand_total);
    }, 0);

    const recentCustomers = sortByCreatedAtDesc(customers)
      .slice(0, 5)
      .map((item) => ({
        id: normalizeText(item.id),
        company_name: normalizeText(item.company_name),
        contact_name: buildContactName(item),
        email: normalizeText(item.email),
        status: normalizeText(item.status || "inactive") || "inactive",
        price_tier: "standard",
        created_at: normalizeText(item.created_at),
      }));

    const recentOrders = orders.slice(0, 6).map(mapOrder);

    return NextResponse.json(
      {
        ok: true,
        stats: {
          productTotal,
          publishedProducts,
          draftProducts,
          archivedProducts,
          missingImageProducts,
          missingPriceProducts,
          missingSeoProducts,
          pendingApplications: 0,
          approvedApplications: 0,
          activeCustomers,
          inactiveCustomers,
          pendingOrders,
          processingOrders,
          completedOrders,
          orderVolume,
          monthlyQuoteVolume,
        },
        recentApplications: [],
        recentCustomers,
        recentOrders,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    return buildErrorResponse(error);
  }
}