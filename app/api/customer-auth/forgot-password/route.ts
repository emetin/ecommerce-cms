import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../lib/sheets";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function buildRowObject(headers: string[], row: unknown[]) {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    acc[String(header || "").trim()] = normalizeText(row[index]);
    return acc;
  }, {});
}

function createTemporaryPassword(length = 10) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
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
    const body = await req.json();
    const email = normalizeLower(body?.email);

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required." },
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
      return normalizeLower(rowObject.email) === email;
    });

    if (rowIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "No customer account found for this email." },
        { status: 404 }
      );
    }

    const currentRow = rows[rowIndex] as unknown[];
    const customer = buildRowObject(headers, currentRow);

    if (normalizeLower(customer.status) !== "active") {
      return NextResponse.json(
        { ok: false, error: "This customer account is not active." },
        { status: 403 }
      );
    }

    const temporaryPassword = createTemporaryPassword(10);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const now = new Date().toISOString();

    const updatedRow = headers.map((header) => {
      switch (header) {
        case "password_hash":
          return passwordHash;
        case "must_change_password":
          return "true";
        case "updated_at":
          return now;
        default:
          return normalizeText(customer[header]);
      }
    });

    await updateSheetRowByRowNumber("customers", rowIndex + 1, updatedRow);

    return NextResponse.json({
      ok: true,
      message: "Temporary password generated successfully.",
      customer: {
        id: normalizeText(customer.id),
        email: normalizeLower(customer.email),
        contactName: buildContactName(customer),
        companyName: buildCompanyName(customer),
      },
      temporaryPassword,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while generating temporary password.",
      },
      { status: 500 }
    );
  }
}