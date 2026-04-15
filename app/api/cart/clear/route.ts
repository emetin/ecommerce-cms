import { NextResponse } from "next/server";
import { getCartTokenFromCookies } from "../../../../lib/cart-cookie";
import { clearCartByToken } from "../../../../lib/cart";

export async function POST() {
  try {
    const cartToken = await getCartTokenFromCookies();

    if (!cartToken) {
      return NextResponse.json({
        ok: true,
        cart: null,
      });
    }

    const cart = await clearCartByToken(cartToken);

    return NextResponse.json({
      ok: true,
      cart,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to clear cart.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}