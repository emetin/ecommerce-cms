import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  CUSTOMER_COOKIE_NAME,
  createCustomerSessionToken,
  getCustomerCookieOptions,
  readCustomerFromSessionToken,
} from "../../../../lib/customer-auth";
import {
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../lib/sheets";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function buildRowObject(headers: string[], row: unknown[]) {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    acc[String(header || "").trim()] = normalizeText(row[index]);
    return acc;
  }, {});
}

function parseCustomerTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_customer_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function buildContactName(customer: Record<string, string>) {
  const first = normalizeText(customer.first_name);
  const last = normalizeText(customer.last_name);
  return [first, last].filter(Boolean).join(" ").trim();
}

function buildCompanyName(customer: Record<string, string>) {
  return normalizeText(customer.company) || normalizeText(customer.company_name);
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseCustomerTokenFromCookie(cookieHeader);
    const session = await readCustomerFromSessionToken(token);

    if (!session?.customerId) {
      return NextResponse.json(
        { ok: false, error: "Customer login required." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const newPassword = normalizeText(body?.new_password);
    const confirmPassword = normalizeText(body?.confirm_password);

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { ok: false, error: "Both password fields are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { ok: false, error: "Passwords do not match." },
        { status: 400 }
      );
    }

    const rows = await getSheetRows("customers");
    const headers = Array.isArray(rows[0])
      ? rows[0].map((cell) => String(cell || "").trim())
      : [];

    if (!headers.length) {
      return NextResponse.json(
        { ok: false, error: "customers sheet headers could not be read." },
        { status: 500 }
      );
    }

    const rowIndex = rows.findIndex((row, index) => {
      if (index === 0 || !Array.isArray(row)) return false;
      const rowObject = buildRowObject(headers, row);
      return normalizeText(rowObject.id) === session.customerId;
    });

    if (rowIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "Customer not found." },
        { status: 404 }
      );
    }

    const currentRow = rows[rowIndex] as unknown[];
    const customer = buildRowObject(headers, currentRow);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    const updatedRow = headers.map((header) => {
      switch (header) {
        case "password_hash":
          return passwordHash;
        case "must_change_password":
          return "false";
        case "updated_at":
          return now;
        default:
          return normalizeText(customer[header]);
      }
    });

    await updateSheetRowByRowNumber("customers", rowIndex + 1, updatedRow);

    const newToken = await createCustomerSessionToken({
      customerId: normalizeText(customer.id),
      email: normalizeText(customer.email).toLowerCase(),
      companyName: buildCompanyName(customer),
      contactName: buildContactName(customer),
      priceTier: normalizeText(customer.price_tier || "standard") || "standard",
      currency: normalizeText(customer.currency || "USD") || "USD",
      mustChangePassword: false,
    });

    const response = NextResponse.json({
      ok: true,
      message: "Password changed successfully.",
      next_path: "/account",
    });

    response.cookies.set({
      name: CUSTOMER_COOKIE_NAME,
      value: newToken,
      ...getCustomerCookieOptions(),
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to change password.",
      },
      { status: 500 }
    );
  }
}