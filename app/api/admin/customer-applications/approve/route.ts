import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  appendSheetRow,
  findRowNumberByField,
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

type ApproveBody = {
  applicationId?: string;
  priceTier?: string;
  currency?: string;
  shippingTerms?: string;
  paymentTerms?: string;
  taxExempt?: string;
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

function createTemporaryPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

function slugifyCompanyCode(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
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

    const body = (await req.json()) as ApproveBody;

    const applicationId = normalizeText(body?.applicationId);
    const priceTier = normalizeText(body?.priceTier || "wholesale") || "wholesale";
    const currency = normalizeText(body?.currency || "USD") || "USD";
    const shippingTerms = normalizeText(body?.shippingTerms || "FOB");
    const paymentTerms = normalizeText(body?.paymentTerms || "Net 30");
    const taxExempt = normalizeText(body?.taxExempt || "false") || "false";

    if (!applicationId) {
      return NextResponse.json(
        { ok: false, error: "applicationId is required." },
        { status: 400 }
      );
    }

    const applicationRowNumber = await findRowNumberByField(
      "customer_applications",
      "id",
      applicationId
    );

    if (!applicationRowNumber) {
      return NextResponse.json(
        { ok: false, error: "Application not found." },
        { status: 404 }
      );
    }

    const allRows = await getSheetRows("customer_applications");
    const headers = allRows[0] || [];
    const row = allRows[applicationRowNumber - 1] || [];

    if (!headers.length || !row.length) {
      return NextResponse.json(
        { ok: false, error: "Application row could not be read." },
        { status: 500 }
      );
    }

    const rowObject = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[String(header).trim()] = String(row[index] || "").trim();
      return acc;
    }, {});

    const currentStatus = normalizeLower(rowObject.status || "pending");
    if (currentStatus === "approved") {
      return NextResponse.json(
        { ok: false, error: "This application is already approved." },
        { status: 400 }
      );
    }

    const companyName = normalizeText(rowObject.company_name);
    const contactName = normalizeText(rowObject.contact_name);
    const email = normalizeText(rowObject.email).toLowerCase();
    const createdAt = normalizeText(rowObject.created_at) || new Date().toISOString();

    if (!companyName || !contactName || !email) {
      return NextResponse.json(
        { ok: false, error: "Application is missing required fields." },
        { status: 400 }
      );
    }

    const customerRows = await getSheetRows("customers");
    const customerHeaders = customerRows[0] || [];
    const customerDataRows = customerRows.slice(1);

    const emailIndex = customerHeaders.findIndex(
      (header) => String(header).trim() === "email"
    );

    if (emailIndex === -1) {
      return NextResponse.json(
        { ok: false, error: 'customers sheet must include "email" column.' },
        { status: 500 }
      );
    }

    const alreadyExists = customerDataRows.some(
      (customerRow) =>
        String(customerRow[emailIndex] || "").trim().toLowerCase() === email
    );

    if (alreadyExists) {
      return NextResponse.json(
        {
          ok: false,
          error: "A customer with this email already exists.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const customerId = `cust_${Date.now()}`;
    const customerCode = `CUST-${slugifyCompanyCode(companyName).toUpperCase() || "NEW"}`;
    const temporaryPassword = createTemporaryPassword(10);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await appendSheetRow("customers", [
      customerId,
      companyName,
      contactName,
      email,
      passwordHash,
      "active",
      customerCode,
      priceTier,
      currency,
      shippingTerms,
      paymentTerms,
      taxExempt,
      now,
      createdAt,
      now,
    ]);

    const updatedApplicationRow = [
      applicationId,
      companyName,
      contactName,
      email,
      normalizeText(rowObject.phone),
      normalizeText(rowObject.country),
      normalizeText(rowObject.business_type),
      normalizeText(rowObject.tax_id),
      normalizeText(rowObject.website),
      normalizeText(rowObject.notes),
      "approved",
      createdAt,
      now,
      "admin",
    ];

    await updateSheetRowByRowNumber(
      "customer_applications",
      applicationRowNumber,
      updatedApplicationRow
    );

    return NextResponse.json({
      ok: true,
      message: "Application approved and customer account created.",
      customer: {
        id: customerId,
        companyName,
        contactName,
        email,
        customerCode,
        priceTier,
        currency,
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
            : "Unknown error while approving application.",
      },
      { status: 500 }
    );
  }
}