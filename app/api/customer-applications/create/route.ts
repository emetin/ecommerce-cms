import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

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
  return String(value ?? "").trim();
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

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as ApplicationBody;

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
      return jsonError(
        "Company name, contact name, and email are required.",
        400
      );
    }

    if (!isValidEmail(email)) {
      return jsonError("Please enter a valid email address.", 400);
    }

    const supabase = createSupabaseAdminClient();

    const { data: existingApplication, error: applicationError } =
      await supabase
        .from("customer_applications")
        .select("id, email, status")
        .eq("email", email)
        .maybeSingle();

    if (applicationError) {
      throw new Error(applicationError.message);
    }

    if (existingApplication) {
      const existingStatus = normalizeLower(existingApplication.status);

      return jsonError(
        existingStatus === "approved"
          ? "An approved application already exists for this email."
          : "An application already exists for this email and is currently under review.",
        400
      );
    }

    const { data: existingCustomer, error: customerError } = await supabase
      .from("customers")
      .select("id, email, status")
      .eq("email", email)
      .maybeSingle();

    if (customerError) {
      throw new Error(customerError.message);
    }

    if (existingCustomer) {
      return jsonError("A customer account already exists for this email.", 400);
    }

    const now = new Date().toISOString();

    const { data: application, error: insertError } = await supabase
      .from("customer_applications")
      .insert({
        company_name: companyName,
        contact_name: contactName,
        email,
        phone: phone || null,
        country: country || null,
        business_type: businessType || null,
        tax_id: taxId || null,
        website: website || null,
        notes: notes || null,
        status: "pending",
        created_at: now,
        approved_at: null,
        reviewed_by: null,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({
      ok: true,
      message:
        "Your application has been received successfully. Our team will review your company information and contact you after approval.",
      id: application.id,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Unknown error while submitting application."
    );
  }
}