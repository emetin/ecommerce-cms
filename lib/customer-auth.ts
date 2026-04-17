import bcrypt from "bcryptjs";
import { getSheetData } from "../lib/sheets";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const CUSTOMER_COOKIE_NAME = "ptx_customer_auth";
export const CUSTOMER_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

type CustomerSessionPayload = {
  sub: "customer";
  customerId: string;
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
  must_change_password?: string;

  // legacy fallback
  company_name?: string;
  contact_name?: string;
  customer_code?: string;
  price_tier?: string;
  currency?: string;
  shipping_terms?: string;
  payment_terms?: string;
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

function normalizeBooleanString(value: unknown) {
  const raw = normalizeLower(value);
  return raw === "true";
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

function buildContactName(customer: CustomerRow) {
  const first = normalizeText(customer.first_name);
  const last = normalizeText(customer.last_name);
  const full = [first, last].filter(Boolean).join(" ").trim();

  return full || normalizeText(customer.contact_name);
}

function buildCompanyName(customer: CustomerRow) {
  return normalizeText(customer.company) || normalizeText(customer.company_name);
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

  const customers = (await getSheetData("customers", {
    ttlSeconds: 60,
  })) as CustomerRow[];

  const customer =
    customers.find((item) => normalizeLower(item.email) === normalizedEmail) || null;

  if (!customer) {
    return null;
  }

  if (normalizeLower(customer.status) !== "active") {
    return null;
  }

  const passwordHash = normalizeText(customer.password_hash);

  if (!passwordHash) {
    return null;
  }

  const isValid = await bcrypt.compare(password, passwordHash);

  if (!isValid) {
    return null;
  }

  return {
    id: normalizeText(customer.id),
    email: normalizeLower(customer.email),
    companyName: buildCompanyName(customer),
    contactName: buildContactName(customer),
    priceTier: normalizeText(customer.price_tier || "standard") || "standard",
    currency: normalizeText(customer.currency || "USD") || "USD",
    customerCode: normalizeText(customer.customer_code),
    mustChangePassword: normalizeBooleanString(customer.must_change_password),
  };
}