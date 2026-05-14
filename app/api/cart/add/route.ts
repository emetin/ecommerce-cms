import { NextResponse } from "next/server";
import {
  CART_COOKIE_NAME,
  getCartTokenFromCookies,
} from "../../../../lib/cart-cookie";
import { createToken } from "../../../../lib/ids";
import { addItemToCart } from "../../../../lib/cart";
import { resolveCartCatalogItem } from "../../../../lib/catalog";
import { resolveQuantityRule } from "../../../../lib/cart-rules";
import { getRateLimitKey, rateLimit } from "../../../../lib/rate-limit";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function toPositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed > 0 ? parsed : fallback;
}

function getCartCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
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

export async function GET() {
  return jsonError("Cart add API only supports POST requests.", 405);
}

export async function POST(req: Request) {
  try {
    const limited = rateLimit({
      key: getRateLimitKey(req, "cart:add"),
      limit: 40,
      windowMs: 60 * 1000,
    });

    if (!limited.ok) {
      return jsonError(
        "Too many cart requests. Please try again shortly.",
        429
      );
    }

    const body = await req.json().catch(() => ({}));

    const productSlug = normalizeText(body?.product_slug);
    const requestedQuantity = toPositiveNumber(body?.quantity, 1);

    if (!productSlug) {
      return jsonError("product_slug is required.", 400);
    }

    const resolved = await resolveCartCatalogItem(productSlug);

    if (resolved.unitPrice <= 0) {
      return jsonError(
        "This product does not have an active price yet. Please contact sales.",
        400
      );
    }

    const quantityRule = resolveQuantityRule({
      quantity: requestedQuantity,
      boxQuantity: resolved.boxQuantity,
    });

    const existingCartToken = await getCartTokenFromCookies();
    const cartToken = existingCartToken || createToken("cart");

    const cart = await addItemToCart(cartToken, {
      product_slug: productSlug,
      variant_id: resolved.variantId,
      product_title: resolved.productTitle,
      variant_title: resolved.variantTitle,
      sku: resolved.sku,
      image: resolved.image,
      unit_price: resolved.unitPrice,
      compare_at_price: resolved.compareAtPrice,
      quantity: quantityRule.quantity,
      min_quantity: quantityRule.minQuantity,
      box_quantity: quantityRule.boxQuantity,
      case_quantity: quantityRule.caseQuantity,
      step_quantity: quantityRule.stepQuantity,
    });

    const response = NextResponse.json({
      ok: true,
      cart,
      quantity_rule: {
        quantity: quantityRule.quantity,
        min_quantity: quantityRule.minQuantity,
        box_quantity: quantityRule.boxQuantity,
        case_quantity: quantityRule.caseQuantity,
        step_quantity: quantityRule.stepQuantity,
        adjusted: quantityRule.adjusted,
        message: quantityRule.message,
      },
    });

    if (!existingCartToken) {
      response.cookies.set(
        CART_COOKIE_NAME,
        cartToken,
        getCartCookieOptions(60 * 60 * 24 * 30)
      );
    }

    return response;
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to add item to cart.",
      500
    );
  }
}