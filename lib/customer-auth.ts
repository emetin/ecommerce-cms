import bcrypt from "bcryptjs";
import { createSupabaseAdminClient } from "./supabase/admin";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const CUSTOMER_COOKIE_NAME = "ptx_customer_auth";
export const CUSTOMER_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

type CustomerSessionPayload = {
  sub: "customer";
  customerId: string;
  customerUserId: string;
  companyId: string;
  email: string;
  companyName: string;
  contactName: string;
  priceTier: string;
  currency: string;
  mustChangePassword: boolean;
  exp: number;
  iat: number;
  nonce: string;
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
  price_list_id?: string | null;
  credit_limit?: number | string | null;
  payment_terms?: string | null;
  currency?: string | null;
};

type CustomerUserRow = {
  id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  password_hash: string | null;
  status: string | null;
  last_login_at: string | null;
  is_primary?: boolean | null;
  permissions_json?: Record<string, unknown> | null;
  customer_companies?: CustomerCompanyRow | null;
};

function getEnvValue(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} tanımlı değil.`);
  }

  return value;
}

function bytesToBase64Url(bytes: Uint8Array) {
  const base64 = Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringToBase64Url(value: string) {
  return bytesToBase64Url(encoder.encode(value));
}

function fromBase64Url(base64Url: string) {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return new Uint8Array(Buffer.from(padded, "base64"));
}

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function buildContactName(customerUser: CustomerUserRow) {
  const first = normalizeText(customerUser.first_name);
  const last = normalizeText(customerUser.last_name);
  const full = [first, last].filter(Boolean).join(" ").trim();

  return full || normalizeText(customerUser.email);
}

function buildCompanyName(company?: CustomerCompanyRow | null) {
  return normalizeText(company?.company_name) || "Customer Company";
}

function normalizeCompanyRelation(
  value: CustomerCompanyRow | CustomerCompanyRow[] | null | undefined
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

export function createNonce(size = 24) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return bytesToBase64Url(bytes);
}

async function getSigningKey() {
  const secret = getEnvValue("CUSTOMER_SESSION_SECRET");

  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signValue(value: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export function getCustomerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_SESSION_DURATION_SECONDS,
  };
}

export function getExpiredCustomerCookieOptions() {
  return {
    ...getCustomerCookieOptions(),
    maxAge: 0,
  };
}

export async function createCustomerSessionToken(input: {
  customerId: string;
  customerUserId?: string;
  companyId?: string;
  email: string;
  companyName?: string;
  contactName?: string;
  priceTier?: string;
  currency?: string;
  mustChangePassword?: boolean;
}) {
  const payload: CustomerSessionPayload = {
    sub: "customer",
    customerId: normalizeText(input.customerId),
    customerUserId: normalizeText(input.customerUserId || input.customerId),
    companyId: normalizeText(input.companyId),
    email: normalizeLower(input.email),
    companyName: normalizeText(input.companyName),
    contactName: normalizeText(input.contactName),
    priceTier: normalizeText(input.priceTier || "standard") || "standard",
    currency: normalizeText(input.currency || "USD") || "USD",
    mustChangePassword: Boolean(input.mustChangePassword),
    iat: nowInSeconds(),
    exp: nowInSeconds() + CUSTOMER_SESSION_DURATION_SECONDS,
    nonce: createNonce(16),
  };

  const header = {
    alg: "HS256",
    typ: "PTX-CUSTOMER",
  };

  const encodedHeader = stringToBase64Url(JSON.stringify(header));
  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = await signValue(unsignedToken);

  return `${unsignedToken}.${signature}`;
}

export async function readCustomerFromSessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, receivedSignature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = await signValue(unsignedToken);

  if (!safeEqual(receivedSignature, expectedSignature)) {
    return null;
  }

  try {
    const payloadJson = decoder.decode(fromBase64Url(encodedPayload));
    const payload = JSON.parse(payloadJson) as Partial<CustomerSessionPayload>;

    if (payload.sub !== "customer") {
      return null;
    }

    if (typeof payload.exp !== "number" || payload.exp <= nowInSeconds()) {
      return null;
    }

    return {
      customerId: normalizeText(payload.customerId),
      customerUserId: normalizeText(
        payload.customerUserId || payload.customerId
      ),
      companyId: normalizeText(payload.companyId),
      email: normalizeLower(payload.email),
      companyName: normalizeText(payload.companyName),
      contactName: normalizeText(payload.contactName),
      priceTier: normalizeText(payload.priceTier || "standard") || "standard",
      currency: normalizeText(payload.currency || "USD") || "USD",
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
  } catch {
    return null;
  }
}

export async function isAuthenticatedCustomer(token?: string | null) {
  const payload = await readCustomerFromSessionToken(token);
  return Boolean(payload?.customerId);
}

export async function verifyCustomerCredentials(email: string, password: string) {
  const normalizedEmail = normalizeLower(email);

  if (!normalizedEmail || !password) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data: customerUser, error } = await supabase
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
      password_hash,
      status,
      last_login_at,
      is_primary,
      permissions_json,
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
        price_list_id,
        credit_limit,
        payment_terms,
        currency
      )
    `
    )
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!customerUser) {
    return null;
  }

  const rawCustomerUser = customerUser as unknown as Omit<
    CustomerUserRow,
    "customer_companies"
  > & {
    customer_companies?: CustomerCompanyRow | CustomerCompanyRow[] | null;
  };

  const company = normalizeCompanyRelation(rawCustomerUser.customer_companies);

  const typedCustomerUser: CustomerUserRow = {
    ...rawCustomerUser,
    customer_companies: company,
  };

  if (normalizeLower(typedCustomerUser.status) !== "active") {
    return null;
  }

  if (company && normalizeLower(company.status) !== "active") {
    return null;
  }

  const passwordHash = normalizeText(typedCustomerUser.password_hash);

  if (!passwordHash) {
    return null;
  }

  const isValid = await bcrypt.compare(password, passwordHash);

  if (!isValid) {
    return null;
  }

  await supabase
    .from("customer_users")
    .update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", typedCustomerUser.id);

  return {
    id: typedCustomerUser.id,
    customerUserId: typedCustomerUser.id,
    companyId: normalizeText(typedCustomerUser.company_id),
    email: normalizeLower(typedCustomerUser.email),
    companyName: buildCompanyName(company),
    contactName: buildContactName(typedCustomerUser),
    priceTier: "standard",
    currency: normalizeText(company?.currency || "USD") || "USD",
    customerCode: "",
    mustChangePassword: false,
  };
}