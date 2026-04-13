import { NextResponse } from "next/server";
import { appendFormSheetRow } from "../../../lib/sheets";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firstName = normalizeText(body?.first_name);
    const lastName = normalizeText(body?.last_name);
    const email = normalizeText(body?.email).toLowerCase();
    const phone = normalizeText(body?.phone);
    const company = normalizeText(body?.company);
    const companyType = normalizeText(body?.company_type);
    const projectType = normalizeText(body?.project_type);
    const estimatedQuantity = normalizeText(body?.estimated_quantity);
    const targetMarket = normalizeText(body?.target_market);
    const requestedCategories = normalizeText(body?.requested_categories);
    const message = normalizeText(body?.message);
    const pageUrl = normalizeText(body?.page_url);

    if (!firstName) {
      return NextResponse.json(
        { ok: false, error: "First name is required." },
        { status: 400 }
      );
    }

    if (!lastName) {
      return NextResponse.json(
        { ok: false, error: "Last name is required." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Valid email is required." },
        { status: 400 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { ok: false, error: "Company is required." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "Message is required." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const id = `contact_${Date.now()}`;

    await appendFormSheetRow("contact_messages", [
      id,
      firstName,
      lastName,
      email,
      phone,
      company,
      companyType,
      projectType,
      estimatedQuantity,
      targetMarket,
      requestedCategories,
      message,
      pageUrl,
      "new",
      now,
    ]);

    return NextResponse.json({
      ok: true,
      message: "Contact message submitted successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to submit contact form.",
      },
      { status: 500 }
    );
  }
}