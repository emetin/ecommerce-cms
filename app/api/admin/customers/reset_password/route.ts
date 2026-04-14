import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  findRowNumberByField,
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

type ResetPasswordBody = {
  customerId?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function createTemporaryPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
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

    const body = (await req.json()) as ResetPasswordBody;
    const customerId = normalizeText(body?.customerId);

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "customerId is required." },
        { status: 400 }
      );
    }

    const rowNumber = await findRowNumberByField("customers", "id", customerId);

    if (!rowNumber) {
      return NextResponse.json(
        { ok: false, error: "Customer not found." },
        { status: 404 }
      );
    }

    const allRows = await getSheetRows("customers");
    const headers = allRows[0] || [];
    const row = allRows[rowNumber - 1] || [];

    if (!headers.length || !row.length) {
      return NextResponse.json(
        { ok: false, error: "Customer row could not be read." },
        { status: 500 }
      );
    }

    const rowObject = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[String(header).trim()] = String(row[index] || "").trim();
      return acc;
    }, {});

    const temporaryPassword = createTemporaryPassword(10);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const now = new Date().toISOString();

    const updatedRow = [
      normalizeText(rowObject.id),
      normalizeText(rowObject.company_name),
      normalizeText(rowObject.contact_name),
      normalizeText(rowObject.email).toLowerCase(),
      passwordHash,
      normalizeText(rowObject.status || "active") || "active",
      normalizeText(rowObject.customer_code),
      normalizeText(rowObject.price_tier || "standard") || "standard",
      normalizeText(rowObject.currency || "USD") || "USD",
      normalizeText(rowObject.shipping_terms),
      normalizeText(rowObject.payment_terms),
      normalizeText(rowObject.tax_exempt),
      normalizeText(rowObject.approved_at),
      normalizeText(rowObject.created_at),
      now,
    ];

    await updateSheetRowByRowNumber("customers", rowNumber, updatedRow);

    return NextResponse.json({
      ok: true,
      message: "Temporary password generated successfully.",
      customer: {
        id: normalizeText(rowObject.id),
        companyName: normalizeText(rowObject.company_name),
        contactName: normalizeText(rowObject.contact_name),
        email: normalizeText(rowObject.email).toLowerCase(),
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
            : "Unknown error while resetting customer password.",
      },
      { status: 500 }
    );
  }
}