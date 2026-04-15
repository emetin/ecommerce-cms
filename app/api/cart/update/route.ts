import { NextResponse } from "next/server";
import { getCartTokenFromCookies } from "../../../../lib/cart-cookie";
import { updateCartItemQuantity } from "../../../../lib/cart";

export async function POST(req: Request) {
  try {
    const cartToken = await getCartTokenFromCookies();

    if (!cartToken) {
      return NextResponse.json(
        { ok: false, error: "Cart token not found." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const itemId = String(body?.item_id || "").trim();
    const quantity = Number(body?.quantity);

    if (!itemId) {
      return NextResponse.json(
        { ok: false, error: "item_id is required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(quantity)) {
      return NextResponse.json(
        { ok: false, error: "quantity must be a valid number." },
        { status: 400 }
      );
    }

    const cart = await updateCartItemQuantity(cartToken, itemId, quantity);

    return NextResponse.json({
      ok: true,
      cart,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update cart item.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}