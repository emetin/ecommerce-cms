import { NextResponse } from "next/server";
import { getCartTokenFromCookies } from "../../../../lib/cart-cookie";
import { getHydratedCartByToken } from "../../../../lib/cart";
import { getStripeServer } from "../../../../lib/stripe";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../../../lib/customer-auth";
import { findCustomerByEmail, findCustomerById } from "../../../../lib/customer-account";

function normalize(value?: string) {
  return String(value || "").trim();
}

function getBaseUrl() {
  const baseUrl = normalize(process.env.NEXT_PUBLIC_SITE_URL);

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  }

  return baseUrl.replace(/\/+$/, "");
}

function buildAbsoluteUrl(path: string) {
  return `${getBaseUrl()}${path}`;
}

function getCookieValue(cookieHeader: string, name: string) {
  const match = cookieHeader.match(
    new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

export async function POST(req: Request) {
  try {
    const stripe = getStripeServer();

    const cartToken = await getCartTokenFromCookies();

    if (!cartToken) {
      return NextResponse.json(
        { ok: false, error: "Cart token not found." },
        { status: 400 }
      );
    }

    const hydratedCart = await getHydratedCartByToken(cartToken);

    if (!hydratedCart || !hydratedCart.items.length) {
      return NextResponse.json(
        { ok: false, error: "Your cart is empty." },
        { status: 400 }
      );
    }

    const cookieHeader = req.headers.get("cookie") || "";
    const customerToken = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const sessionCustomer = await readCustomerFromSessionToken(customerToken);

    let profileCustomer: Awaited<ReturnType<typeof findCustomerById>> | null = null;

    if (sessionCustomer?.customerId) {
      profileCustomer = await findCustomerById(sessionCustomer.customerId);
    } else if (sessionCustomer?.email) {
      profileCustomer = await findCustomerByEmail(sessionCustomer.email);
    }

    const body = await req.json();

    const email = (
      normalize(body?.email).toLowerCase() ||
      normalize(sessionCustomer?.email).toLowerCase() ||
      normalize(profileCustomer?.email).toLowerCase()
    );

    const firstName =
      normalize(body?.first_name) || normalize(profileCustomer?.first_name);

    const lastName =
      normalize(body?.last_name) || normalize(profileCustomer?.last_name);

    const company =
      normalize(body?.company) || normalize(profileCustomer?.company);

    const phone = normalize(body?.phone) || normalize(profileCustomer?.phone);

    const country =
      normalize(body?.country) || normalize(profileCustomer?.country);

    const city = normalize(body?.city) || normalize(profileCustomer?.city);

    const addressLine1 =
      normalize(body?.address_line_1) || normalize(profileCustomer?.address_line_1);

    const addressLine2 =
      normalize(body?.address_line_2) || normalize(profileCustomer?.address_line_2);

    const postalCode =
      normalize(body?.postal_code) || normalize(profileCustomer?.postal_code);

    const paymentMethod = normalize(body?.payment_method || "card");
    const cardholderName =
      normalize(body?.cardholder_name) ||
      [firstName, lastName].filter(Boolean).join(" ");

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required." },
        { status: 400 }
      );
    }

    if (!firstName || !lastName || !country || !city || !addressLine1) {
      return NextResponse.json(
        { ok: false, error: "Missing required checkout fields." },
        { status: 400 }
      );
    }

    const currency = normalize(hydratedCart.cart.currency || "USD").toLowerCase();

    const lineItems = hydratedCart.items.map((item) => {
      const unitAmount = Math.round(Number(item.unit_price_number || 0) * 100);

      if (!unitAmount || unitAmount < 1) {
        throw new Error(
          `Invalid unit price for product: ${
            item.product_title || item.product_slug || "unknown"
          }`
        );
      }

      return {
        quantity: Math.max(1, Number(item.quantity_number || 1)),
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: {
            name: item.product_title || "Product",
            description: item.variant_title || undefined,
            images: item.image ? [item.image] : undefined,
            metadata: {
              product_slug: item.product_slug || "",
              variant_id: item.variant_id || "",
              sku: item.sku || "",
            },
          },
        },
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      success_url: buildAbsoluteUrl(
        "/checkout/success?session_id={CHECKOUT_SESSION_ID}"
      ),
      cancel_url: buildAbsoluteUrl("/checkout/cancel"),
      line_items: lineItems,
      metadata: {
        source: "global-cms-checkout",
        cart_token: cartToken,
        cart_id: hydratedCart.cart.id,
        customer_id: normalize(sessionCustomer?.customerId || profileCustomer?.id),
        customer_email: email,
        first_name: firstName,
        last_name: lastName,
        company: company || "",
        phone: phone || "",
        country,
        city,
        address_line_1: addressLine1,
        address_line_2: addressLine2 || "",
        postal_code: postalCode || "",
        payment_method: paymentMethod || "card",
        cardholder_name: cardholderName || "",
      },
    });

    if (!session.url) {
      throw new Error("Stripe checkout URL was not returned.");
    }

    return NextResponse.json({
      ok: true,
      session_id: session.id,
      checkout_url: session.url,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}