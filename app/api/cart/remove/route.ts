import { NextResponse } from "next/server";
import { ensureCartToken } from "../../../../lib/cart-cookie";
import {
  getOrCreateHydratedCartByToken,
  removeCartItem,
} from "../../../../lib/cart";
import { getRateLimitKey, rateLimit } from "../../../../lib/rate-limit";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const limited = rateLimit({
      key: getRateLimitKey(req, "cart:remove"),
      limit: 60,
      windowMs: 60 * 1000,
    });

    if (!limited.ok) {
      return jsonError(
        "Too many cart remove requests. Please try again shortly.",
        429
      );
    }

    const cartToken = await ensureCartToken();
    const body = await req.json().catch(() => ({}));
    const itemId = normalizeText(body?.item_id);

    if (!itemId) {
      return jsonError("item_id is required.", 400);
    }

    const currentCart = await getOrCreateHydratedCartByToken(cartToken);
    const currentItem = currentCart.items.find((item) => item.id === itemId);

    if (!currentItem) {
      return NextResponse.json({
        ok: true,
        cart: currentCart,
      });
    }

    const cart = await removeCartItem(cartToken, itemId);

    return NextResponse.json({
      ok: true,
      cart,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to remove cart item.",
      500
    );
  }
}