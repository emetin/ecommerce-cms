import { NextResponse } from "next/server";
import { getCartTokenFromCookies } from "../../../../lib/cart-cookie";
import { getHydratedCartByToken } from "../../../../lib/cart";
import { resolveCartCatalogItem } from "../../../../lib/catalog";
import { assertValidQuantityRule } from "../../../../lib/cart-rules";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../../../lib/customer-auth";
import {
  findCustomerByEmail,
  findCustomerById,
} from "../../../../lib/customer-account";

type StripeLineItem = {
  quantity: number;
  currency: string;
  unitAmount: number;
  productName: string;
  productDescription: string;
  productImage: string;
  productSlug: string;
  variantId: string;
  sku: string;
};

function normalize(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return normalize(value).toLowerCase();
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

function isPaymentEnabled() {
  return process.env.CHECKOUT_PAYMENT_ENABLED === "true";
}

function getStripeSecretKey() {
  return normalize(process.env.STRIPE_SECRET_KEY);
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

function appendFormValue(params: URLSearchParams, key: string, value: unknown) {
  const normalized = normalize(value);

  if (normalized) {
    params.append(key, normalized);
  }
}

function appendStripeLineItem(
  params: URLSearchParams,
  index: number,
  item: StripeLineItem
) {
  params.append(`line_items[${index}][quantity]`, String(item.quantity));

  params.append(
    `line_items[${index}][price_data][currency]`,
    item.currency.toLowerCase()
  );

  params.append(
    `line_items[${index}][price_data][unit_amount]`,
    String(item.unitAmount)
  );

  params.append(
    `line_items[${index}][price_data][product_data][name]`,
    item.productName
  );

  if (item.productDescription) {
    params.append(
      `line_items[${index}][price_data][product_data][description]`,
      item.productDescription
    );
  }

  if (item.productImage) {
    params.append(
      `line_items[${index}][price_data][product_data][images][0]`,
      item.productImage
    );
  }

  params.append(
    `line_items[${index}][price_data][product_data][metadata][product_slug]`,
    item.productSlug
  );

  params.append(
    `line_items[${index}][price_data][product_data][metadata][variant_id]`,
    item.variantId
  );

  params.append(
    `line_items[${index}][price_data][product_data][metadata][sku]`,
    item.sku
  );
}

async function createStripeCheckoutSession(input: {
  secretKey: string;
  email: string;
  lineItems: StripeLineItem[];
  metadata: Record<string, string>;
}) {
  const params = new URLSearchParams();

  params.append("mode", "payment");
  params.append("customer_email", input.email);
  params.append(
    "success_url",
    buildAbsoluteUrl("/checkout/success?session_id={CHECKOUT_SESSION_ID}")
  );
  params.append("cancel_url", buildAbsoluteUrl("/checkout/cancel"));

  input.lineItems.forEach((item, index) => {
    appendStripeLineItem(params, index, item);
  });

  Object.entries(input.metadata).forEach(([key, value]) => {
    appendFormValue(params, `metadata[${key}]`, value);
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error?.message || "Stripe checkout session could not be created.";

    throw new Error(message);
  }

  if (!data?.id || !data?.url) {
    throw new Error("Stripe checkout URL was not returned.");
  }

  return {
    id: String(data.id),
    url: String(data.url),
  };
}

async function buildVerifiedStripeLineItems(
  hydratedCart: Awaited<ReturnType<typeof getHydratedCartByToken>>
): Promise<StripeLineItem[]> {
  if (!hydratedCart) {
    return [];
  }

  const currency = normalize(hydratedCart.cart.currency || "USD").toLowerCase();
  const lineItems: StripeLineItem[] = [];

  for (const item of hydratedCart.items) {
    const productSlug = normalize(item.product_slug);
    const variantId = normalize(item.variant_id);
    const quantity = Number(item.quantity_number || item.quantity || 0);

    if (!productSlug || !variantId) {
      throw new Error(
        "A cart item is missing product or variant information. Please remove it and add the product again."
      );
    }

    const resolved = await resolveCartCatalogItem(productSlug, variantId);

    if (!resolved.variant?.id) {
      throw new Error(
        `${resolved.productTitle} does not have a purchasable variant anymore.`
      );
    }

    if (resolved.unitPrice <= 0) {
      throw new Error(
        `${resolved.productTitle} does not have an active price anymore.`
      );
    }

    const quantityRule = assertValidQuantityRule({
      quantity,
      minQuantity: resolved.minQuantity,
      boxQuantity: resolved.boxQuantity,
      caseQuantity: resolved.caseQuantity,
    });

    const unitAmount = Math.round(Number(resolved.unitPrice || 0) * 100);

    if (!unitAmount || unitAmount < 1) {
      throw new Error(
        `Invalid unit price for product: ${resolved.productTitle || productSlug}`
      );
    }

    lineItems.push({
      quantity: quantityRule.quantity,
      currency,
      unitAmount,
      productName: resolved.productTitle || "Product",
      productDescription: resolved.variantTitle || "",
      productImage: resolved.image || "",
      productSlug,
      variantId: resolved.variant.id,
      sku: resolved.sku || "",
    });
  }

  return lineItems;
}

export async function GET() {
  return jsonError(
    "Online payment checkout is disabled. Please use Submit Quote Request.",
    405
  );
}

export async function POST(req: Request) {
  try {
    if (!isPaymentEnabled()) {
      return jsonError(
        "Online payment checkout is currently disabled. Please use Submit Quote Request.",
        400
      );
    }

    const stripeSecretKey = getStripeSecretKey();

    if (!stripeSecretKey) {
      return jsonError(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY before enabling online payments.",
        500
      );
    }

    const cartToken = await getCartTokenFromCookies();

    if (!cartToken) {
      return jsonError("Cart token not found.", 400);
    }

    const hydratedCart = await getHydratedCartByToken(cartToken);

    if (!hydratedCart || !hydratedCart.items.length) {
      return jsonError("Your cart is empty.", 400);
    }

    const cookieHeader = req.headers.get("cookie") || "";
    const customerToken = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const sessionCustomer = await readCustomerFromSessionToken(customerToken);

    let profileCustomer: Awaited<ReturnType<typeof findCustomerById>> | null =
      null;

    if (sessionCustomer?.customerId) {
      profileCustomer = await findCustomerById(sessionCustomer.customerId);
    } else if (sessionCustomer?.email) {
      profileCustomer = await findCustomerByEmail(sessionCustomer.email);
    }

    const body = await req.json().catch(() => ({}));

    const email =
      normalizeEmail(body?.email) ||
      normalizeEmail(sessionCustomer?.email) ||
      normalizeEmail(profileCustomer?.email);

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
      normalize(body?.address_line_1) ||
      normalize(profileCustomer?.address_line_1);

    const addressLine2 =
      normalize(body?.address_line_2) ||
      normalize(profileCustomer?.address_line_2);

    const postalCode =
      normalize(body?.postal_code) || normalize(profileCustomer?.postal_code);

    const paymentMethod = normalize(body?.payment_method || "card");
    const cardholderName =
      normalize(body?.cardholder_name) ||
      [firstName, lastName].filter(Boolean).join(" ");

    if (!email) {
      return jsonError("Email is required.", 400);
    }

    if (!firstName || !lastName || !country || !city || !addressLine1) {
      return jsonError("Missing required checkout fields.", 400);
    }

    const lineItems = await buildVerifiedStripeLineItems(hydratedCart);

    if (!lineItems.length) {
      return jsonError("Your cart is empty.", 400);
    }

    const session = await createStripeCheckoutSession({
      secretKey: stripeSecretKey,
      email,
      lineItems,
      metadata: {
        source: "global-cms-checkout",
        cart_token: cartToken,
        cart_id: normalize(hydratedCart.cart.id),
        customer_id: normalize(
          sessionCustomer?.customerId || profileCustomer?.id
        ),
        customer_email: email,
        first_name: firstName,
        last_name: lastName,
        company,
        phone,
        country,
        city,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        postal_code: postalCode,
        payment_method: paymentMethod || "card",
        cardholder_name: cardholderName,
      },
    });

    return NextResponse.json({
      ok: true,
      session_id: session.id,
      checkout_url: session.url,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create checkout session.";

    return jsonError(message, 500);
  }
}