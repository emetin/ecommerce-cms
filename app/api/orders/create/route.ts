import { NextResponse } from "next/server";
import {
  getCartTokenFromCookies,
  resetCartToken,
} from "../../../../lib/cart-cookie";
import { createOrderFromCartToken } from "../../../../lib/order";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../../../lib/customer-auth";
import { getRateLimitKey, rateLimit } from "../../../../lib/rate-limit";

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

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function validateRequiredFields(input: {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  country: string;
  city: string;
  addressLine1: string;
}) {
  if (!input.email) {
    return "Email is required.";
  }

  if (!input.firstName) {
    return "First name is required.";
  }

  if (!input.lastName) {
    return "Last name is required.";
  }

  if (!input.company) {
    return "Company is required.";
  }

  if (!input.phone) {
    return "Phone is required.";
  }

  if (!input.country) {
    return "Country is required.";
  }

  if (!input.city) {
    return "City is required.";
  }

  if (!input.addressLine1) {
    return "Address line 1 is required.";
  }

  return "";
}

function mapQuoteRequestError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("quote cart is empty") ||
    normalized.includes("cart is empty")
  ) {
    return {
      message: "Your quote cart is empty. Please add products before submitting.",
      status: 400,
    };
  }

  if (
    normalized.includes("cart not found") ||
    normalized.includes("cart token not found")
  ) {
    return {
      message:
        "Your quote cart could not be found. Please add products again and submit a new request.",
      status: 404,
    };
  }

  if (
    normalized.includes("already been converted") ||
    normalized.includes("already been submitted")
  ) {
    return {
      message:
        "This quote cart has already been submitted. Please start a new quote request.",
      status: 409,
    };
  }

  if (
    normalized.includes("product not found") ||
    normalized.includes("product is not available") ||
    normalized.includes("selected variant could not be found") ||
    normalized.includes("does not have a purchasable variant") ||
    normalized.includes("does not have an active price") ||
    normalized.includes("no longer available") ||
    normalized.includes("active price anymore") ||
    normalized.includes("missing variant information") ||
    normalized.includes("missing product information")
  ) {
    return {
      message:
        "One or more products in your quote cart are no longer available or need to be re-added. Please review your quote cart.",
      status: 400,
    };
  }

  if (
    normalized.includes("minimum quantity") ||
    normalized.includes("quantity must be ordered") ||
    normalized.includes("multiples of") ||
    normalized.includes("case multiples") ||
    normalized.includes("box multiples")
  ) {
    return {
      message,
      status: 400,
    };
  }

  if (normalized.includes("is required")) {
    return {
      message,
      status: 400,
    };
  }

  if (
    normalized.includes("sheet headers") ||
    normalized.includes("row could not be found")
  ) {
    return {
      message:
        "Quote request could not be completed because the order data structure needs attention. Please contact the administrator.",
      status: 500,
    };
  }

  return {
    message: message || "Failed to submit quote request.",
    status: 500,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Quote request create API is working.",
  });
}

export async function POST(req: Request) {
  try {
    const limited = rateLimit({
      key: getRateLimitKey(req, "orders:create"),
      limit: 12,
      windowMs: 60 * 1000,
    });

    if (!limited.ok) {
      return jsonError(
        "Too many quote request attempts. Please try again shortly.",
        429
      );
    }

    const cartToken = await getCartTokenFromCookies();

    if (!cartToken) {
      return jsonError(
        "Your quote cart could not be found. Please add products again.",
        400
      );
    }

    const cookieHeader = req.headers.get("cookie") || "";
    const customerToken = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const session = await readCustomerFromSessionToken(customerToken);

    const body = await req.json().catch(() => ({}));

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

    const validationError = validateRequiredFields({
      email: effectiveEmail,
      firstName,
      lastName,
      company,
      phone,
      country,
      city,
      addressLine1,
    });

    if (validationError) {
      return jsonError(validationError, 400);
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

    await resetCartToken();

    return NextResponse.json({
      ok: true,
      message: "Quote request submitted successfully.",
      order: result.order,
      items: result.items,
      next_path: `/order-success?order=${encodeURIComponent(
        result.order.order_number
      )}`,
    });
  } catch (error) {
    const rawMessage =
      error instanceof Error
        ? error.message
        : "Failed to submit quote request.";

    const mapped = mapQuoteRequestError(rawMessage);

    return jsonError(mapped.message, mapped.status);
  }
}