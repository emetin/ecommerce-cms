import { NextResponse } from "next/server";
import {
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

type UpdateStatusBody = {
  customerId?: string;
  status?: string;
};

const ALLOWED_STATUSES = new Set(["active", "inactive"]);

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

    const body = (await req.json()) as UpdateStatusBody;
    const customerId = normalizeText(body?.customerId);
    const status = normalizeLower(body?.status);

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "customerId is required." },
        { status: 400 }
      );
    }

    if (!status || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid customer status." },
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
    const now = new Date().toISOString();

    const updatedRow = headers.map((header) => {
      switch (header) {
        case "id":
          return normalizeText(customer.id);
        case "company_name":
          return normalizeText(customer.company_name);
        case "contact_name":
          return normalizeText(customer.contact_name);
        case "email":
          return normalizeText(customer.email).toLowerCase();
        case "password_hash":
          return normalizeText(customer.password_hash);
        case "status":
          return status;
        case "customer_code":
          return normalizeText(customer.customer_code);
        case "price_tier":
          return normalizeText(customer.price_tier || "standard") || "standard";
        case "currency":
          return normalizeText(customer.currency || "USD") || "USD";
        case "shipping_terms":
          return normalizeText(customer.shipping_terms);
        case "payment_terms":
          return normalizeText(customer.payment_terms);
        case "tax_exempt":
          return normalizeText(customer.tax_exempt);
        case "approved_at":
          return normalizeText(customer.approved_at);
        case "created_at":
          return normalizeText(customer.created_at);
        case "updated_at":
          return now;
        default:
          return normalizeText(customer[header]);
      }
    });

    await updateSheetRowByRowNumber("customers", rowIndex + 1, updatedRow);

    return NextResponse.json({
      ok: true,
      message: "Customer status updated successfully.",
      customer: {
        id: normalizeText(customer.id),
        companyName: normalizeText(customer.company_name),
        email: normalizeText(customer.email).toLowerCase(),
        status,
        updatedAt: now,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while updating customer status.",
      },
      { status: 500 }
    );
  }
}