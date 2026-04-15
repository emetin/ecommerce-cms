import { NextResponse } from "next/server";
import { ensureCartToken } from "../../../../lib/cart-cookie";
import { getHydratedCartByToken, getOrCreateCart, syncCartTotals } from "../../../../lib/cart";

export async function GET() {
  try {
    const cartToken = await ensureCartToken();
    const existing = await getHydratedCartByToken(cartToken);

    if (existing) {
      const synced = await syncCartTotals(existing.cart.id);
      return NextResponse.json({ ok: true, cart: synced });
    }

    const cart = await getOrCreateCart(cartToken);
    const hydrated = await getHydratedCartByToken(cart.cart_token);

    return NextResponse.json({
      ok: true,
      cart: hydrated,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get cart.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}