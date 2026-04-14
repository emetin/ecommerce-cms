import { NextResponse } from "next/server";
import { appendSheetRow, getSheetData } from "../../../../lib/sheets";

type ApplicationBody = {
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  business_type?: string;
  tax_id?: string;
  website?: string;
  notes?: string;
};

type ExistingApplicationRow = {
  id?: string;
  email?: string;
  status?: string;
};

type ExistingCustomerRow = {
  id?: string;
  email?: string;
  status?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeWebsite(value: string) {
  const clean = normalizeText(value);
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;
  return `https://${clean}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ApplicationBody;

    const companyName = normalizeText(body?.company_name);
    const contactName = normalizeText(body?.contact_name);
    const email = normalizeLower(body?.email);
    const phone = normalizeText(body?.phone);
    const country = normalizeText(body?.country);
    const businessType = normalizeText(body?.business_type);
    const taxId = normalizeText(body?.tax_id);
    const website = normalizeWebsite(String(body?.website || ""));
    const notes = normalizeText(body?.notes);

    if (!companyName || !contactName || !email) {
      return NextResponse.json(
        {
          ok: false,
          error: "Company name, contact name, and email are required.",
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    const [applications, customers] = await Promise.all([
      getSheetData("customer_applications", { ttlSeconds: 30 }),
      getSheetData("customers", { ttlSeconds: 30 }),
    ]);

    const existingApplication = (applications as ExistingApplicationRow[]).find(
      (item) => normalizeLower(item.email) === email
    );

    if (existingApplication) {
      const existingStatus = normalizeLower(existingApplication.status || "pending");

      return NextResponse.json(
        {
          ok: false,
          error:
            existingStatus === "approved"
              ? "An approved application already exists for this email."
              : "An application already exists for this email and is currently under review.",
        },
        { status: 400 }
      );
    }

    const existingCustomer = (customers as ExistingCustomerRow[]).find(
      (item) => normalizeLower(item.email) === email
    );

    if (existingCustomer) {
      return NextResponse.json(
        {
          ok: false,
          error: "A customer account already exists for this email.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await appendSheetRow("customer_applications", [
      id,
      companyName,
      contactName,
      email,
      phone,
      country,
      businessType,
      taxId,
      website,
      notes,
      "pending",
      now,
      "",
      "",
    ]);

    return NextResponse.json({
      ok: true,
      message:
        "Your application has been received successfully. Our team will review your company information and contact you after approval.",
      id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while submitting application.",
      },
      { status: 500 }
    );
  }
}