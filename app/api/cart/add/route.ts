import { NextResponse } from "next/server";
import { ensureCartToken } from "../../../../lib/cart-cookie";
import { addItemToCart } from "../../../../lib/cart";
import { resolveCartCatalogItem } from "../../../../lib/catalog";
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
    const variantId = normalizeText(body?.variant_id);
    const requestedQuantity = toPositiveNumber(body?.quantity, 1);

    if (!productSlug) {
      return jsonError("product_slug is required.", 400);
    }

    const resolved = await resolveCartCatalogItem(productSlug, variantId);

    if (!resolved.variant?.id) {
      return jsonError(
        "This product does not have a purchasable variant yet. Please contact sales.",
        400
      );
    }

    if (resolved.unitPrice <= 0) {
      return jsonError(
        "This product does not have an active price yet. Please contact sales.",
        400
      );
    }

    const cartToken = await ensureCartToken();

    const cart = await addItemToCart(cartToken, {
      product_slug: productSlug,
      variant_id: resolved.variant.id,
      product_title: resolved.productTitle,
      variant_title: resolved.variantTitle,
      sku: resolved.sku,
      image: resolved.image,
      unit_price: resolved.unitPrice,
      compare_at_price: resolved.compareAtPrice,
      quantity: requestedQuantity,
    });

    return NextResponse.json({
      ok: true,
      cart,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to add item to cart.",
      500
    );
  }
}