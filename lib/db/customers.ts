import { createSupabaseAdminClient } from "../supabase/admin";

export const CUSTOMER_STATUSES = [
  "pending",
  "active",
  "suspended",
  "archived",
] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export type CustomerListParams = {
  status?: string | null;
  q?: string | null;
  page?: number;
  limit?: number;
};

type CustomerCompanyRow = {
  id: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  status: string | null;
  notes: string | null;
  tax_id?: string | null;
  customer_type?: string | null;
  industry?: string | null;
  source?: string | null;
  payment_terms?: string | null;
  currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CustomerUserRow = {
  id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  status: string | null;
  last_login_at: string | null;
  is_primary?: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  customer_companies?: CustomerCompanyRow | CustomerCompanyRow[] | null;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeLimit(value: unknown) {
  const number = Number(value || 50);

  if (!Number.isFinite(number) || number <= 0) return 50;

  return Math.min(number, 200);
}

function normalizePage(value: unknown) {
  const number = Number(value || 1);

  if (!Number.isFinite(number) || number <= 0) return 1;

  return Math.floor(number);
}

function isAllowedStatus(value: string) {
  return CUSTOMER_STATUSES.includes(value as CustomerStatus);
}

function normalizeCompanyRelation(
  value: CustomerCompanyRow | CustomerCompanyRow[] | null | undefined
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function buildName(user: CustomerUserRow) {
  return [user.first_name, user.last_name]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeCustomerListItem(row: CustomerUserRow) {
  const company = normalizeCompanyRelation(row.customer_companies);

  return {
    id: row.id,
    customer_user_id: row.id,
    company_id: normalizeText(row.company_id),
    name: buildName(row),
    first_name: normalizeText(row.first_name),
    last_name: normalizeText(row.last_name),
    email: normalizeLower(row.email),
    phone: normalizeText(row.phone || company?.phone),
    role: normalizeText(row.role),
    status: normalizeLower(row.status || "pending"),
    is_primary: Boolean(row.is_primary),
    last_login_at: normalizeText(row.last_login_at),
    created_at: normalizeText(row.created_at),
    updated_at: normalizeText(row.updated_at),

    company_name: normalizeText(company?.company_name),
    company_email: normalizeLower(company?.email),
    company_phone: normalizeText(company?.phone),
    website: normalizeText(company?.website),
    country: normalizeText(company?.country),
    state: normalizeText(company?.state),
    city: normalizeText(company?.city),
    address_line_1: normalizeText(company?.address_line_1),
    address_line_2: normalizeText(company?.address_line_2),
    postal_code: normalizeText(company?.postal_code),
    company_status: normalizeLower(company?.status || "pending"),
    customer_type: normalizeText(company?.customer_type),
    industry: normalizeText(company?.industry),
    source: normalizeText(company?.source),
    payment_terms: normalizeText(company?.payment_terms),
    currency: normalizeText(company?.currency || "USD") || "USD",
    notes: normalizeText(company?.notes),
  };
}

export async function getCustomersList(params: CustomerListParams) {
  const supabase = createSupabaseAdminClient();

  const status = normalizeLower(params.status);
  const query = normalizeText(params.q);
  const page = normalizePage(params.page);
  const limit = normalizeLimit(params.limit);

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (status && !isAllowedStatus(status)) {
    throw new Error("Invalid customer status filter.");
  }

  let request = supabase
    .from("customer_users")
    .select(
      `
      id,
      company_id,
      first_name,
      last_name,
      email,
      phone,
      role,
      status,
      last_login_at,
      is_primary,
      created_at,
      updated_at,
      customer_companies (
        id,
        company_name,
        email,
        phone,
        website,
        country,
        state,
        city,
        address_line_1,
        address_line_2,
        postal_code,
        status,
        notes,
        tax_id,
        customer_type,
        industry,
        source,
        payment_terms,
        currency,
        created_at,
        updated_at
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    request = request.eq("status", status);
  }

  if (query) {
    const safeQuery = query.replace(/[%]/g, "");

    request = request.or(
      [
        `email.ilike.%${safeQuery}%`,
        `first_name.ilike.%${safeQuery}%`,
        `last_name.ilike.%${safeQuery}%`,
        `phone.ilike.%${safeQuery}%`,
      ].join(",")
    );
  }

  const { data, count, error } = await request;

  if (error) {
    throw new Error(error.message);
  }

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    total,
    page,
    limit,
    totalPages,
    items: ((data || []) as unknown as CustomerUserRow[]).map(
      normalizeCustomerListItem
    ),
  };
}

export async function updateCustomerStatus(input: {
  customerUserId: string;
  companyId?: string | null;
  status: string;
}) {
  const supabase = createSupabaseAdminClient();

  const customerUserId = normalizeText(input.customerUserId);
  const companyId = normalizeText(input.companyId);
  const status = normalizeLower(input.status);

  if (!customerUserId) {
    throw new Error("Customer user id is required.");
  }

  if (!isAllowedStatus(status)) {
    throw new Error("Invalid customer status.");
  }

  const timestamp = new Date().toISOString();

  const { data: updatedUser, error: userError } = await supabase
    .from("customer_users")
    .update({
      status,
      updated_at: timestamp,
    })
    .eq("id", customerUserId)
    .select("id, company_id, email, status")
    .maybeSingle();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!updatedUser) {
    throw new Error("Customer user not found.");
  }

  const targetCompanyId = companyId || normalizeText(updatedUser.company_id);

  if (targetCompanyId) {
    const { error: companyError } = await supabase
      .from("customer_companies")
      .update({
        status,
        updated_at: timestamp,
      })
      .eq("id", targetCompanyId);

    if (companyError) {
      throw new Error(companyError.message);
    }
  }

  return updatedUser;
}

export async function archiveCustomer(input: {
  customerUserId: string;
  companyId?: string | null;
}) {
  return updateCustomerStatus({
    customerUserId: input.customerUserId,
    companyId: input.companyId,
    status: "archived",
  });
}