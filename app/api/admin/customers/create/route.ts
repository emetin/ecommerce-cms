import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { requireAdminFromRequest } from "../../../../../lib/api/admin";
import { createSupabaseAdminClient } from "../../../../../lib/supabase/admin";

type CreateCustomerBody = {
  email?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  company_name?: string;
  phone?: string;
  website?: string;
  country?: string;
  state?: string;
  city?: string;
  address_line_1?: string;
  address_line_2?: string;
  postal_code?: string;
  status?: string;
  tax_id?: string;
  customer_type?: string;
  industry?: string;
  source?: string;
  payment_terms?: string;
  price_tier?: string;
  currency?: string;
  customer_code?: string;
  notes?: string;
};

const ALLOWED_STATUSES = ["pending", "active", "suspended", "archived"];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeStatus(value: unknown) {
  const status = normalizeLower(value || "active");

  if (ALLOWED_STATUSES.includes(status)) {
    return status;
  }

  return "active";
}

function normalizeWebsite(value: unknown) {
  const clean = normalizeText(value);

  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;

  return `https://${clean}`;
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

function splitNameFromContactName(value: string) {
  const parts = normalizeText(value).split(/\s+/g).filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    await requireAdminFromRequest(req);

    const body = (await req.json().catch(() => ({}))) as CreateCustomerBody;

    const email = normalizeLower(body.email);
    const companyName = normalizeText(body.company_name || body.company);

    let firstName = normalizeText(body.first_name);
    let lastName = normalizeText(body.last_name);

    if (!firstName && !lastName) {
      const parsedName = splitNameFromContactName(normalizeText(body.company));
      firstName = parsedName.firstName;
      lastName = parsedName.lastName;
    }

    const phone = normalizeText(body.phone);
    const website = normalizeWebsite(body.website);
    const status = normalizeStatus(body.status);
    const currency = normalizeText(body.currency || "USD") || "USD";
    const paymentTerms = normalizeText(body.payment_terms);
    const customerCode =
      normalizeText(body.customer_code) || generateCustomerCode(companyName);

    if (!email) {
      return jsonError("Email is required.", 400);
    }

    if (!isValidEmail(email)) {
      return jsonError("Please enter a valid email address.", 400);
    }

    if (!companyName) {
      return jsonError("Company name is required.", 400);
    }

    if (!firstName && !lastName) {
      return jsonError("First name or last name is required.", 400);
    }

    const supabase = createSupabaseAdminClient();

    const { data: existingUser, error: existingUserError } = await supabase
      .from("customer_users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingUserError) {
      throw new Error(existingUserError.message);
    }

    if (existingUser) {
      return jsonError("A customer with this email already exists.", 409);
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const now = new Date();
    const expiresAt = addDays(now, 7);
    const timestamp = now.toISOString();

    const { data: company, error: companyError } = await supabase
      .from("customer_companies")
      .insert({
        company_name: companyName,
        email,
        phone: phone || null,
        website: website || null,
        country: normalizeText(body.country) || null,
        state: normalizeText(body.state) || null,
        city: normalizeText(body.city) || null,
        address_line_1: normalizeText(body.address_line_1) || null,
        address_line_2: normalizeText(body.address_line_2) || null,
        postal_code: normalizeText(body.postal_code) || null,
        status,
        notes: normalizeText(body.notes) || null,
        tax_id: normalizeText(body.tax_id) || null,
        customer_type: normalizeText(body.customer_type) || null,
        industry: normalizeText(body.industry) || null,
        source: normalizeText(body.source || "admin") || "admin",
        payment_terms: paymentTerms || null,
        currency,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select("id, company_name")
      .single();

    if (companyError) {
      throw new Error(companyError.message);
    }

    const { data: user, error: userError } = await supabase
      .from("customer_users")
      .insert({
        company_id: company.id,
        first_name: firstName || null,
        last_name: lastName || null,
        email,
        phone: phone || null,
        role: "primary",
        status,
        password_hash: passwordHash,
        last_login_at: null,
        is_primary: true,
        must_change_password: true,
        reset_token: null,
        reset_token_expires_at: null,
        reset_requested_at: null,
        temporary_password_created_at: timestamp,
        temporary_password_expires_at: expiresAt.toISOString(),
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select("id, email, first_name, last_name, company_id")
      .single();

    if (userError) {
      throw new Error(userError.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Customer created successfully.",
      customer: {
        id: user.id,
        customer_user_id: user.id,
        company_id: company.id,
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        company: company.company_name,
        company_name: company.company_name,
        customer_code: customerCode,
        price_tier: normalizeText(body.price_tier || "standard") || "standard",
        currency,
        status,
      },
      temporaryPassword,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to create customer."
    );
  }
}