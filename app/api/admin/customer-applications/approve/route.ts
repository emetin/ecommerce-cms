import { NextResponse } from "next/server";
import {
  appendSheetRow,
  findRowNumberByField,
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";
import {
  buildCustomerResetUrl,
  createResetExpiryIso,
  generateRawResetToken,
} from "../../../../../lib/customer-password-reset";
import { sendCustomerPortalApprovalEmail } from "../../../../../lib/customer-mail";

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

function splitContactName(value: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.slice(-1).join(""),
  };
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

    const allRows = await getSheetRows("customer_applications", {
      forceFresh: true,
      ttlSeconds: 0,
    });

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
    const phone = normalizeText(rowObject.phone);
    const country = normalizeText(rowObject.country);
    const createdAt = normalizeText(rowObject.created_at) || new Date().toISOString();

    if (!companyName || !contactName || !email) {
      return NextResponse.json(
        { ok: false, error: "Application is missing required fields." },
        { status: 400 }
      );
    }

    const customerRows = await getSheetRows("customers", {
      forceFresh: true,
      ttlSeconds: 0,
    });

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
    const { firstName, lastName } = splitContactName(contactName);

    const resetToken = generateRawResetToken();
    const resetTokenExpiresAt = createResetExpiryIso();
    const resetUrl = buildCustomerResetUrl(resetToken, email);

    await appendSheetRow("customers", [
      customerId,                // id
      email,                     // email
      "",                        // password_hash
      firstName,                 // first_name
      lastName,                  // last_name
      companyName,               // company
      phone,                     // phone
      country,                   // country
      "",                        // city
      "",                        // address_line_1
      "",                        // address_line_2
      "",                        // postal_code
      "active",                  // status
      now,                       // created_at
      now,                       // updated_at
      "",                        // last_login_at
      taxExempt,                 // tax_exempt
      now,                       // approved_at
      "true",                    // must_change_password
      priceTier,                 // price_tier
      currency,                  // currency
      customerCode,              // customer_code
      resetToken,                // reset_token
      resetTokenExpiresAt,       // reset_token_expires_at
      now,                       // reset_requested_at
    ]);

    const updatedApplicationRow = [
      applicationId,
      companyName,
      contactName,
      email,
      phone,
      country,
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

    await sendCustomerPortalApprovalEmail({
      to: email,
      contactName,
      companyName,
      resetUrl,
    });

    return NextResponse.json({
      ok: true,
      message: "Application approved, customer account created, and setup email sent.",
      customer: {
        id: customerId,
        companyName,
        contactName,
        email,
        customerCode,
        priceTier,
        currency,
      },
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