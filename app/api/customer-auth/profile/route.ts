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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const session = await readCustomerFromSessionToken(token);

    if (!session?.customerUserId && !session?.customerId) {
      return jsonResponse({
        ok: true,
        authenticated: false,
        customer: null,
      });
    }

    const customer = await findCustomerById(
      session.customerUserId || session.customerId
    );

    if (!customer) {
      return jsonResponse(
        {
          ok: false,
          authenticated: true,
          customer: null,
          error: "Customer not found.",
        },
        404
      );
    }

    return jsonResponse({
      ok: true,
      authenticated: true,
      customer: sanitizeCustomer(customer),
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        authenticated: false,
        customer: null,
        error:
          error instanceof Error ? error.message : "Failed to load profile.",
      },
      500
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const session = await readCustomerFromSessionToken(token);

    if (!session?.customerUserId && !session?.customerId) {
      return jsonResponse(
        {
          ok: false,
          authenticated: false,
          error: "Customer login required.",
        },
        401
      );
    }

    const body = await req.json();

    const updated = await updateCustomerProfile(
      session.customerUserId || session.customerId,
      {
        first_name: body?.first_name,
        last_name: body?.last_name,
        company: body?.company,
        phone: body?.phone,
        country: body?.country,
        city: body?.city,
        address_line_1: body?.address_line_1,
        address_line_2: body?.address_line_2,
        postal_code: body?.postal_code,
      }
    );

    if (!updated) {
      return jsonResponse(
        {
          ok: false,
          authenticated: true,
          error: "Customer profile could not be updated.",
        },
        404
      );
    }

    return jsonResponse({
      ok: true,
      authenticated: true,
      customer: sanitizeCustomer(updated),
      message: "Profile updated successfully.",
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to update profile.",
      },
      400
    );
  }
}