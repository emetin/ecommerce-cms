import { NextResponse } from "next/server";
import { ensureCartToken } from "../../../../lib/cart-cookie";
import { addItemToCart } from "../../../../lib/cart";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const productSlug = String(body?.product_slug || "").trim();
    const variantId = String(body?.variant_id || "").trim();
    const productTitle = String(body?.product_title || "").trim();
    const variantTitle = String(body?.variant_title || "").trim();
    const sku = String(body?.sku || "").trim();
    const image = String(body?.image || "").trim();
    const unitPrice = body?.unit_price;
    const compareAtPrice = body?.compare_at_price;
    const quantity = Number(body?.quantity || 1);

    if (!productSlug) {
      return NextResponse.json(
        { ok: false, error: "product_slug is required." },
        { status: 400 }
      );
    }

    if (!productTitle) {
      return NextResponse.json(
        { ok: false, error: "product_title is required." },
        { status: 400 }
      );
    }

    if (unitPrice == null || unitPrice === "") {
      return NextResponse.json(
        { ok: false, error: "unit_price is required." },
        { status: 400 }
      );
    }

    const cartToken = await ensureCartToken();

    const cart = await addItemToCart(cartToken, {
      product_slug: productSlug,
      variant_id: variantId,
      product_title: productTitle,
      variant_title: variantTitle,
      sku,
      image,
      unit_price: unitPrice,
      compare_at_price: compareAtPrice,
      quantity,
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