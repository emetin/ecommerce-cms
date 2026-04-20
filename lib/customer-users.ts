import { getSheetData, updateSheetRowByRowNumber } from "./sheets";

const CUSTOMERS_SHEET_NAME = "customers";

function normalize(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalize(value).toLowerCase();
}

function toBooleanString(value: unknown, fallback = "false") {
  const normalized = normalizeLower(value);
  return normalized === "true" ? "true" : fallback;
}

type CustomerSheetRow = {
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
  must_change_password?: string;
  price_tier?: string;
  currency?: string;
  customer_code?: string;
  reset_token?: string;
  reset_token_expires_at?: string;
  reset_requested_at?: string;
};

export type CustomerRecord = {
  rowNumber: number;
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  country: string;
  city: string;
  address_line_1: string;
  address_line_2: string;
  postal_code: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login_at: string;
  tax_exempt: string;
  approved_at: string;
  must_change_password: string;
  price_tier: string;
  currency: string;
  customer_code: string;
  reset_token: string;
  reset_token_expires_at: string;
  reset_requested_at: string;
};

function mapCustomerRow(
  row: CustomerSheetRow,
  index: number
): CustomerRecord {
  return {
    rowNumber: index + 2,
    id: normalize(row.id),
    email: normalizeLower(row.email),
    password_hash: normalize(row.password_hash),
    first_name: normalize(row.first_name),
    last_name: normalize(row.last_name),
    company: normalize(row.company),
    phone: normalize(row.phone),
    country: normalize(row.country),
    city: normalize(row.city),
    address_line_1: normalize(row.address_line_1),
    address_line_2: normalize(row.address_line_2),
    postal_code: normalize(row.postal_code),
    status: normalize(row.status),
    created_at: normalize(row.created_at),
    updated_at: normalize(row.updated_at),
    last_login_at: normalize(row.last_login_at),
    tax_exempt: toBooleanString(row.tax_exempt, "false"),
    approved_at: normalize(row.approved_at),
    must_change_password: toBooleanString(row.must_change_password, "false"),
    price_tier: normalize(row.price_tier || "standard") || "standard",
    currency: normalize(row.currency || "USD") || "USD",
    customer_code: normalize(row.customer_code),
    reset_token: normalize(row.reset_token),
    reset_token_expires_at: normalize(row.reset_token_expires_at),
    reset_requested_at: normalize(row.reset_requested_at),
  };
}

function buildCustomerRowValues(record: CustomerRecord) {
  return [
    record.id,
    record.email,
    record.password_hash,
    record.first_name,
    record.last_name,
    record.company,
    record.phone,
    record.country,
    record.city,
    record.address_line_1,
    record.address_line_2,
    record.postal_code,
    record.status,
    record.created_at,
    record.updated_at,
    record.last_login_at,
    record.tax_exempt,
    record.approved_at,
    record.must_change_password,
    record.price_tier,
    record.currency,
    record.customer_code,
    record.reset_token,
    record.reset_token_expires_at,
    record.reset_requested_at,
  ];
}

async function getAllCustomers(forceFresh = false) {
  const rows = (await getSheetData(CUSTOMERS_SHEET_NAME, {
    forceFresh,
    ttlSeconds: 60,
  })) as CustomerSheetRow[];

  return rows.map((row, index) => mapCustomerRow(row, index));
}

export async function findCustomerByEmail(email: string) {
  const normalizedEmail = normalizeLower(email);

  if (!normalizedEmail) {
    return null;
  }

  const customers = await getAllCustomers();

  return customers.find((item) => item.email === normalizedEmail) || null;
}

export async function findCustomerByResetToken(token: string) {
  const normalizedToken = normalize(token);

  if (!normalizedToken) {
    return null;
  }

  const customers = await getAllCustomers(true);

  return customers.find((item) => item.reset_token === normalizedToken) || null;
}

export async function setCustomerResetTokenByEmail(
  email: string,
  token: string,
  expiresAt: string
) {
  const customer = await findCustomerByEmail(email);

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const updated: CustomerRecord = {
    ...customer,
    updated_at: new Date().toISOString(),
    reset_token: normalize(token),
    reset_token_expires_at: normalize(expiresAt),
    reset_requested_at: new Date().toISOString(),
  };

  await updateSheetRowByRowNumber(
    CUSTOMERS_SHEET_NAME,
    updated.rowNumber,
    buildCustomerRowValues(updated)
  );

  return { ok: true };
}

export async function clearCustomerResetTokenByEmail(email: string) {
  const customer = await findCustomerByEmail(email);

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const updated: CustomerRecord = {
    ...customer,
    updated_at: new Date().toISOString(),
    reset_token: "",
    reset_token_expires_at: "",
    reset_requested_at: "",
  };

  await updateSheetRowByRowNumber(
    CUSTOMERS_SHEET_NAME,
    updated.rowNumber,
    buildCustomerRowValues(updated)
  );

  return { ok: true };
}

export async function updateCustomerPasswordHashByEmail(
  email: string,
  newPasswordHash: string
) {
  const customer = await findCustomerByEmail(email);

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const updated: CustomerRecord = {
    ...customer,
    password_hash: normalize(newPasswordHash),
    updated_at: new Date().toISOString(),
    must_change_password: "false",
    reset_token: "",
    reset_token_expires_at: "",
    reset_requested_at: "",
  };

  await updateSheetRowByRowNumber(
    CUSTOMERS_SHEET_NAME,
    updated.rowNumber,
    buildCustomerRowValues(updated)
  );

  return { ok: true };
}