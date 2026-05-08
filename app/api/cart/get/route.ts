import { NextResponse } from "next/server";
import { getCartTokenFromCookies } from "../../../../lib/cart-cookie";
import { getHydratedCartByToken, syncCartTotals } from "../../../../lib/cart";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function createEmptyCartFallback() {
  return {
    cart: null,
    items: [],
    totals: {
      subtotal: 0,
      discount_total: 0,
      shipping_total: 0,
      tax_total: 0,
      grand_total: 0,
      item_count: 0,
    },
  };
}

export async function GET() {
  try {
    const cartToken = await getCartTokenFromCookies();

    if (!cartToken) {
      return NextResponse.json({
        ok: true,
        cart: createEmptyCartFallback(),
      });
    }

    const hydrated = await getHydratedCartByToken(cartToken);

    if (!hydrated?.cart?.id) {
      return NextResponse.json({
        ok: true,
        cart: createEmptyCartFallback(),
      });
    }

    try {
      const synced = await syncCartTotals(hydrated.cart.id);

      return NextResponse.json({
        ok: true,
        cart: synced,
      });
    } catch {
      return NextResponse.json({
        ok: true,
        cart: hydrated,
      });
    }
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to get cart.",
      500
    );
  }
}