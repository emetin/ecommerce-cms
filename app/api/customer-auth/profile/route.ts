import { NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../../../lib/customer-auth";
import {
  findCustomerById,
  sanitizeCustomer,
  updateCustomerProfile,
} from "../../../../lib/customer-account";

function getCookieValue(cookieHeader: string, name: string) {
  const match = cookieHeader.match(
    new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const session = await readCustomerFromSessionToken(token);

    if (!session?.customerId) {
      return NextResponse.json(
        { ok: false, error: "Customer login required." },
        { status: 401 }
      );
    }

    const customer = await findCustomerById(session.customerId);

    if (!customer) {
      return NextResponse.json(
        { ok: false, error: "Customer not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      customer: sanitizeCustomer(customer),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load profile.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const session = await readCustomerFromSessionToken(token);

    if (!session?.customerId) {
      return NextResponse.json(
        { ok: false, error: "Customer login required." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const updated = await updateCustomerProfile(session.customerId, {
      first_name: body?.first_name,
      last_name: body?.last_name,
      company: body?.company,
      phone: body?.phone,
      country: body?.country,
      city: body?.city,
      address_line_1: body?.address_line_1,
      address_line_2: body?.address_line_2,
      postal_code: body?.postal_code,
    });

    return NextResponse.json({
      ok: true,
      customer: sanitizeCustomer(updated),
      message: "Profile updated successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to update profile.",
      },
      { status: 400 }
    );
  }
}