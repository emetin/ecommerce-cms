import { NextResponse } from "next/server";
import { ensureCartToken } from "../../../../lib/cart-cookie";
import { addItemToCart } from "../../../../lib/cart";
import { resolveCartCatalogItem } from "../../../../lib/catalog";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const productSlug = String(body?.product_slug || "").trim();
    const variantId = String(body?.variant_id || "").trim();
    const requestedQuantity = Number(body?.quantity || 1);

    if (!productSlug) {
      return NextResponse.json(
        { ok: false, error: "product_slug is required." },
        { status: 400 }
      );
    }

    const resolved = await resolveCartCatalogItem(productSlug, variantId);

    if (!resolved.variant?.id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This product does not have a purchasable variant yet. Please request a quote.",
        },
        { status: 400 }
      );
    }

    if (resolved.unitPrice <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This product does not have an active price yet. Please request a quote.",
        },
        { status: 400 }
      );
    }

    const cartToken = await ensureCartToken();

    const cart = await addItemToCart(cartToken, {
      product_slug: productSlug,
      variant_id: resolved.variant.id || "",
      product_title: resolved.productTitle,
      variant_title: resolved.variantTitle,
      sku: resolved.sku,
      image: resolved.image,
      unit_price: resolved.unitPrice,
      compare_at_price: resolved.compareAtPrice,
      quantity: Number.isFinite(requestedQuantity) ? requestedQuantity : 1,
    });

    return NextResponse.json({
      ok: true,
      cart,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add item to cart.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}