import { NextResponse } from "next/server";
import { appendSheetRow } from "../../../../lib/sheets";

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

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ApplicationBody;

    const companyName = normalizeText(body?.company_name);
    const contactName = normalizeText(body?.contact_name);
    const email = normalizeText(body?.email);
    const phone = normalizeText(body?.phone);
    const country = normalizeText(body?.country);
    const businessType = normalizeText(body?.business_type);
    const taxId = normalizeText(body?.tax_id);
    const website = normalizeText(body?.website);
    const notes = normalizeText(body?.notes);

    if (!companyName || !contactName || !email) {
      return NextResponse.json(
        {
          ok: false,
          error: "Company name, contact name ve email zorunludur.",
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
      message: "Başvurunuz alındı. Onay sonrası sizinle iletişime geçilecektir.",
      id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Başvuru gönderilirken bilinmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}