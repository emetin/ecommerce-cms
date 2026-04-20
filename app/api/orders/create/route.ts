import { NextResponse } from "next/server";
import { getCartTokenFromCookies } from "../../../../lib/cart-cookie";
import { createOrderFromCartToken } from "../../../../lib/order";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../../../lib/customer-auth";

function getCookieValue(cookieHeader: string, name: string) {
  const match = cookieHeader.match(
    new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Orders create API is working.",
  });
}

export async function POST(req: Request) {
  try {
    const cartToken = await getCartTokenFromCookies();

    if (!cartToken) {
      return NextResponse.json(
        { ok: false, error: "Cart token not found." },
        { status: 400 }
      );
    }

    const cookieHeader = req.headers.get("cookie") || "";
    const customerToken = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const session = await readCustomerFromSessionToken(customerToken);

    const body = await req.json();

    const email = normalizeEmail(body?.email);
    const firstName = normalizeText(body?.first_name);
    const lastName = normalizeText(body?.last_name);
    const company = normalizeText(body?.company);
    const phone = normalizeText(body?.phone);
    const country = normalizeText(body?.country);
    const city = normalizeText(body?.city);
    const addressLine1 = normalizeText(body?.address_line_1);
    const addressLine2 = normalizeText(body?.address_line_2);
    const postalCode = normalizeText(body?.postal_code);
    const note = normalizeText(body?.note);

    const effectiveEmail = normalizeEmail(session?.email || email);

    if (!effectiveEmail) {
      return NextResponse.json(
        { ok: false, error: "Email is required." },
        { status: 400 }
      );
    }

    if (!country) {
      return NextResponse.json(
        { ok: false, error: "Country is required." },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        { ok: false, error: "City is required." },
        { status: 400 }
      );
    }

    if (!addressLine1) {
      return NextResponse.json(
        { ok: false, error: "Address line 1 is required." },
        { status: 400 }
      );
    }

    const result = await createOrderFromCartToken(cartToken, {
      customer_id: session?.customerId || "",
      email: effectiveEmail,
      first_name: firstName,
      last_name: lastName,
      company,
      phone,
      country,
      city,
      address_line_1: addressLine1,
      address_line_2: addressLine2,
      postal_code: postalCode,
      note,
    });

    return NextResponse.json({
      ok: true,
      order: result.order,
      items: result.items,
      next_path: `/order-success?order=${encodeURIComponent(
        result.order.order_number
      )}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create order.";

    if (message === "Your cart is empty.") {
      return NextResponse.json(
        { ok: false, error: message },
        { status: 400 }
      );
    }

    if (message === "Cart not found." || message === "Cart token not found.") {
      return NextResponse.json(
        { ok: false, error: message },
        { status: 404 }
      );
    }

    if (message === "This cart has already been converted to an order.") {
      return NextResponse.json(
        { ok: false, error: message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}