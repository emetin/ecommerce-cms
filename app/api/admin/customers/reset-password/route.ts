import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";
import { createSupabaseAdminClient } from "../../../../../lib/supabase/admin";

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

function generateTemporaryPassword() {
  const partOne = randomBytes(4).toString("hex");
  const partTwo = randomBytes(3).toString("hex");

  return `Gtx-${partOne}-${partTwo}!`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeCompanyRelation(value: unknown) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseAdminTokenFromCookie(cookieHeader);
    const isAdmin = await verifyAdminSessionToken(token);

    if (!isAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const customerUserId = normalizeText(
      body?.customer_user_id || body?.customerId || body?.id
    );

    if (!customerUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Customer user id is required.",
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: customerUser, error: customerError } = await supabase
      .from("customer_users")
      .select(
        `
        id,
        company_id,
        first_name,
        last_name,
        email,
        phone,
        status,
        customer_companies (
          id,
          company_name,
          email,
          phone,
          status,
          currency
        )
      `
      )
      .eq("id", customerUserId)
      .maybeSingle();

    if (customerError) {
      throw new Error(customerError.message);
    }

    if (!customerUser) {
      return NextResponse.json(
        {
          ok: false,
          error: "Customer not found.",
        },
        { status: 404 }
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const now = new Date();
    const expiresAt = addDays(now, 7);

    const { error: updateError } = await supabase
      .from("customer_users")
      .update({
        password_hash: passwordHash,
        must_change_password: true,
        temporary_password_created_at: now.toISOString(),
        temporary_password_expires_at: expiresAt.toISOString(),
        reset_token: null,
        reset_token_expires_at: null,
        reset_requested_at: null,
        updated_at: now.toISOString(),
      })
      .eq("id", customerUserId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const customerRecord = customerUser as Record<string, unknown>;
    const company = normalizeCompanyRelation(customerRecord.customer_companies);

    const firstName = normalizeText(customerRecord.first_name);
    const lastName = normalizeText(customerRecord.last_name);

    const contactName =
      [firstName, lastName].filter(Boolean).join(" ") ||
      normalizeText(customerRecord.email);

    const companyName =
      normalizeText(company?.company_name) ||
      normalizeText(customerRecord.email);

    return NextResponse.json({
      ok: true,
      message: "Temporary password generated successfully.",
      temporaryPassword,
      expiresAt: expiresAt.toISOString(),
      customer: {
        id: normalizeText(customerRecord.id),
        customerUserId: normalizeText(customerRecord.id),
        companyId: normalizeText(customerRecord.company_id),
        email: normalizeLower(customerRecord.email),
        companyName,
        contactName,
        status: normalizeLower(customerRecord.status || "active"),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate temporary password.",
      },
      { status: 500 }
    );
  }
}