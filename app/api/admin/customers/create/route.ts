import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";
import {
  appendSheetRow,
  getSheetData,
  getSheetHeaders,
} from "../../../../../lib/sheets";
import { createId, nowIso } from "../../../../../lib/ids";

const CUSTOMERS_SHEET = "customers";

type CreateCustomerBody = {
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
  tax_exempt?: string;
  price_tier?: string;
  currency?: string;
  customer_code?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generateTemporaryPassword() {
  const partOne = randomBytes(4).toString("hex");
  const partTwo = randomBytes(3).toString("hex");
  return `Gtx-${partOne}-${partTwo}!`;
}

function generateCustomerCode(company: string) {
  const prefix =
    company
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 4)
      .toUpperCase() || "CUST";

  const suffix = String(Date.now()).slice(-5);
  return `${prefix}-${suffix}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function emailExists(email: string) {
  const customers = (await getSheetData(CUSTOMERS_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  })) as Array<Record<string, string>>;

  return customers.some((customer) => normalizeLower(customer.email) === email);
}

function buildRow(headers: string[], record: Record<string, string>) {
  return headers.map((header) => normalizeText(record[header]));
}

export async function POST(req: Request) {
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

    const body = (await req.json()) as CreateCustomerBody;

    const email = normalizeLower(body.email);
    const firstName = normalizeText(body.first_name);
    const lastName = normalizeText(body.last_name);
    const company = normalizeText(body.company);

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!firstName && !lastName) {
      return NextResponse.json(
        { ok: false, error: "First name or last name is required." },
        { status: 400 }
      );
    }

    if (await emailExists(email)) {
      return NextResponse.json(
        { ok: false, error: "A customer with this email already exists." },
        { status: 409 }
      );
    }

    const headers = await getSheetHeaders(CUSTOMERS_SHEET, {
      forceFresh: true,
      ttlSeconds: 0,
    });

    if (!headers.length) {
      return NextResponse.json(
        { ok: false, error: "customers sheet headers could not be read." },
        { status: 500 }
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const now = new Date();
    const expiresAt = addDays(now, 7);
    const timestamp = nowIso();

    const record: Record<string, string> = {
      id: createId("cus"),
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      company,
      phone: normalizeText(body.phone),
      country: normalizeText(body.country),
      city: normalizeText(body.city),
      address_line_1: normalizeText(body.address_line_1),
      address_line_2: normalizeText(body.address_line_2),
      postal_code: normalizeText(body.postal_code),
      status: normalizeLower(body.status || "active") || "active",
      created_at: timestamp,
      updated_at: timestamp,
      last_login_at: "",
      tax_exempt:
        normalizeLower(body.tax_exempt) === "true" ? "true" : "false",
      approved_at: timestamp,
      must_change_password: "true",
      price_tier: normalizeLower(body.price_tier || "standard") || "standard",
      currency: normalizeText(body.currency || "USD") || "USD",
      customer_code:
        normalizeText(body.customer_code) || generateCustomerCode(company),
      reset_token: "",
      reset_token_expires_at: "",
      reset_requested_at: "",
      temporary_password_created_at: now.toISOString(),
      temporary_password_expires_at: expiresAt.toISOString(),
    };

    const row = buildRow(headers, record);

    await appendSheetRow(CUSTOMERS_SHEET, row);

    return NextResponse.json({
      ok: true,
      message: "Customer created successfully.",
      customer: {
        id: record.id,
        email: record.email,
        first_name: record.first_name,
        last_name: record.last_name,
        company: record.company,
        customer_code: record.customer_code,
        price_tier: record.price_tier,
        currency: record.currency,
      },
      temporaryPassword,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create customer.",
      },
      { status: 500 }
    );
  }
}