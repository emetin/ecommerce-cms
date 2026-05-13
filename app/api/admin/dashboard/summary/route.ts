import { NextResponse } from "next/server";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";
import { getSheetData } from "../../../../../lib/sheets";
import { getAllOrders } from "../../../../../lib/order";
import { toNumber } from "../../../../../lib/money";

type ProductRow = Record<string, string>;

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

type CustomerRow = {
  id?: string;
  email?: string;
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

  company_name?: string;
  contact_name?: string;
  customer_code?: string;
  price_tier?: string;
  currency?: string;
  shipping_terms?: string;
  payment_terms?: string;
};

type OrderSummaryItem = {
  id: string;
  order_number: string;
  customer_id: string;
  company_name: string;
  status: string;
  subtotal: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function buildCustomerFullName(row: CustomerRow) {
  const first = normalizeText(row.first_name);
  const last = normalizeText(row.last_name);
  const full = [first, last].filter(Boolean).join(" ").trim();

  return full || normalizeText(row.contact_name);
}

function buildCustomerCompany(row: CustomerRow) {
  return normalizeText(row.company) || normalizeText(row.company_name);
}

function sortByCreatedAtDesc<T extends { created_at?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

    return bTime - aTime;
  });
}

function mapApplication(row: ApplicationRow) {
  return {
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
  };
}

function mapCustomer(row: CustomerRow) {
  return {
    id: normalizeText(row.id),
    company_name: buildCustomerCompany(row),
    contact_name: buildCustomerFullName(row),
    email: normalizeText(row.email),
    status: normalizeText(row.status || "inactive") || "inactive",
    price_tier: normalizeText(row.price_tier || "standard") || "standard",
    currency: normalizeText(row.currency || "USD") || "USD",
    created_at: normalizeText(row.created_at),
  };
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

    const [productsRaw, applicationsRaw, customersRaw, ordersRaw] =
      await Promise.all([
        getSheetData("products", {
          forceFresh: false,
          ttlSeconds: 60,
        }) as Promise<ProductRow[]>,

        getSheetData("customer_applications", {
          forceFresh: false,
          ttlSeconds: 60,
        }) as Promise<ApplicationRow[]>,

        getSheetData("customers", {
          forceFresh: false,
          ttlSeconds: 60,
        }) as Promise<CustomerRow[]>,

        getAllOrders({
          forceFresh: false,
          ttlSeconds: 60,
        }),
      ]);

    const productTotal = productsRaw.filter((item) =>
      normalizeText(item.slug)
    ).length;

    const applications = sortByCreatedAtDesc(
      applicationsRaw.map(mapApplication)
    );

    const customers = sortByCreatedAtDesc(customersRaw.map(mapCustomer));

    const orders: OrderSummaryItem[] = ordersRaw.map((order) => ({
      id: normalizeText(order.id),
      order_number: normalizeText(order.order_number),
      customer_id: normalizeText(order.customer_id),
      company_name: normalizeText(order.company),
      status: normalizeText(order.status || "submitted"),
      subtotal: toNumber(order.subtotal),
      currency: normalizeText(order.currency || "USD") || "USD",
      created_at: normalizeText(order.created_at),
      updated_at: normalizeText(order.updated_at),
    }));

    const pendingApplications = applications.filter(
      (item) => normalizeLower(item.status) === "pending"
    ).length;

    const approvedApplications = applications.filter(
      (item) => normalizeLower(item.status) === "approved"
    ).length;

    const activeCustomers = customers.filter(
      (item) => normalizeLower(item.status) === "active"
    ).length;

    const inactiveCustomers = customers.filter(
      (item) => normalizeLower(item.status) !== "active"
    ).length;

    const pendingOrders = orders.filter((item) =>
      ["pending", "submitted", "reviewing"].includes(normalizeLower(item.status))
    ).length;

    const processingOrders = orders.filter((item) =>
      ["approved", "processing", "quoted"].includes(normalizeLower(item.status))
    ).length;

    const completedOrders = orders.filter(
      (item) => normalizeLower(item.status) === "completed"
    ).length;

    const orderVolume = orders.reduce(
      (sum, item) => sum + Number(item.subtotal || 0),
      0
    );

    return NextResponse.json(
      {
        ok: true,
        stats: {
          productTotal,
          pendingApplications,
          approvedApplications,
          activeCustomers,
          inactiveCustomers,
          pendingOrders,
          processingOrders,
          completedOrders,
          orderVolume,
        },
        recentApplications: applications.slice(0, 5),
        recentCustomers: customers.slice(0, 5),
        recentOrders: orders.slice(0, 6),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
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
}