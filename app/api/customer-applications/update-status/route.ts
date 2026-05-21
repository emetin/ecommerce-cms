import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../lib/api/admin";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

const ALLOWED_STATUS = ["pending", "approved", "rejected"];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeWebsite(value: unknown) {
  const clean = normalizeText(value);

  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;

  return `https://${clean}`;
}

function splitName(value: string) {
  const parts = normalizeText(value).split(/\s+/g).filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
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
    const adminSession = await requireAdminFromRequest(req);

    const body = await req.json().catch(() => ({}));

    const id = normalizeText(body?.id);
    const status = normalizeLower(body?.status);
    const createCustomer = String(body?.create_customer ?? "true") === "true";

    if (!id) {
      return jsonError("Application ID is required.", 400);
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return jsonError(
        'Status must be one of: "pending", "approved", or "rejected".',
        400
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: application, error: applicationError } = await supabase
      .from("customer_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (applicationError) {
      throw new Error(applicationError.message);
    }

    if (!application) {
      return jsonError("Application not found.", 404);
    }

    const now = new Date().toISOString();
    const reviewedBy =
      adminSession.email || adminSession.name || adminSession.adminUserId || "";

    const { data: updatedApplication, error: updateError } = await supabase
      .from("customer_applications")
      .update({
        status,
        approved_at: status === "approved" ? now : null,
        reviewed_by: reviewedBy || null,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    let customerCreated = false;
    let customerUserId = "";
    let companyId = "";

    if (status === "approved" && createCustomer) {
      const email = normalizeLower(application.email);

      const { data: existingUser, error: existingUserError } = await supabase
        .from("customer_users")
        .select("id, company_id, email")
        .eq("email", email)
        .maybeSingle();

      if (existingUserError) {
        throw new Error(existingUserError.message);
      }

      if (existingUser?.id) {
        customerUserId = existingUser.id;
        companyId = normalizeText(existingUser.company_id);
      } else {
        const contact = splitName(application.contact_name);

        const { data: createdCompany, error: companyCreateError } =
          await supabase
            .from("customer_companies")
            .insert({
              company_name: application.company_name,
              email,
              phone: application.phone || null,
              website: normalizeWebsite(application.website) || null,
              country: application.country || null,
              state: null,
              city: null,
              address_line_1: null,
              address_line_2: null,
              postal_code: null,
              status: "active",
              notes: application.notes || null,
              tax_id: application.tax_id || null,
              customer_type: application.business_type || null,
              industry: null,
              source: "application",
              payment_terms: null,
              currency: "USD",
              created_at: now,
              updated_at: now,
            })
            .select("id")
            .single();

        if (companyCreateError) {
          throw new Error(companyCreateError.message);
        }

        companyId = createdCompany.id;

        const { data: createdUser, error: userCreateError } = await supabase
          .from("customer_users")
          .insert({
            company_id: companyId,
            first_name: contact.firstName || application.contact_name || null,
            last_name: contact.lastName || null,
            email,
            phone: application.phone || null,
            role: "primary",
            status: "active",
            password_hash: null,
            last_login_at: null,
            is_primary: true,
            must_change_password: true,
            reset_token: null,
            reset_token_expires_at: null,
            reset_requested_at: null,
            temporary_password_created_at: null,
            temporary_password_expires_at: null,
            created_at: now,
            updated_at: now,
          })
          .select("id")
          .single();

        if (userCreateError) {
          throw new Error(userCreateError.message);
        }

        customerCreated = true;
        customerUserId = createdUser.id;
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Application status updated successfully.",
      item: updatedApplication,
      customer_created: customerCreated,
      customer_user_id: customerUserId,
      company_id: companyId,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to update application status."
    );
  }
}