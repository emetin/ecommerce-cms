import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";
import {
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../../lib/sheets";

const CUSTOMERS_SHEET = "customers";

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

function buildRowObject(headers: string[], row: unknown[]) {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    acc[String(header || "").trim()] = normalizeText(row[index]);
    return acc;
  }, {});
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

    const body = await req.json();
    const customerId = normalizeText(body?.customerId);

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "customerId is required." },
        { status: 400 }
      );
    }

    const rows = await getSheetRows(CUSTOMERS_SHEET, {
      forceFresh: true,
      ttlSeconds: 0,
    });

    const headers = Array.isArray(rows[0])
      ? rows[0].map((cell) => normalizeText(cell))
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
      return normalizeText(rowObject.id) === customerId;
    });

    if (rowIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "Customer not found." },
        { status: 404 }
      );
    }

    const currentRow = rows[rowIndex] as unknown[];
    const customer = buildRowObject(headers, currentRow);

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const now = new Date();
    const expiresAt = addDays(now, 7);

    const updatedRow = headers.map((header) => {
      switch (header) {
        case "password_hash":
          return passwordHash;
        case "must_change_password":
          return "true";
        case "temporary_password_created_at":
          return now.toISOString();
        case "temporary_password_expires_at":
          return expiresAt.toISOString();
        case "reset_token":
          return "";
        case "reset_token_expires_at":
          return "";
        case "reset_requested_at":
          return "";
        case "updated_at":
          return now.toISOString();
        case "status":
          return normalizeLower(customer.status || "active") || "active";
        default:
          return normalizeText(customer[header]);
      }
    });

    await updateSheetRowByRowNumber(CUSTOMERS_SHEET, rowIndex + 1, updatedRow);

    return NextResponse.json({
      ok: true,
      message: "Temporary password generated successfully.",
      temporaryPassword,
      expiresAt: expiresAt.toISOString(),
      customer: {
        id: normalizeText(customer.id),
        email: normalizeLower(customer.email),
        companyName: normalizeText(customer.company || customer.company_name),
        contactName:
          [customer.first_name, customer.last_name]
            .map(normalizeText)
            .filter(Boolean)
            .join(" ") || normalizeText(customer.contact_name),
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