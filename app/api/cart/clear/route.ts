import { NextResponse } from "next/server";
import { ensureCartToken } from "../../../../lib/cart-cookie";
import {
  clearCartByToken,
  getOrCreateHydratedCartByToken,
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

export async function POST(req: Request) {
  try {
    const limited = rateLimit({
      key: getRateLimitKey(req, "cart:clear"),
      limit: 30,
      windowMs: 60 * 1000,
    });

    if (!limited.ok) {
      return jsonError(
        "Too many cart clear requests. Please try again shortly.",
        429
      );
    }

    const cartToken = await ensureCartToken();

    const clearedCart = await clearCartByToken(cartToken);

    if (clearedCart) {
      return NextResponse.json({
        ok: true,
        cart: clearedCart,
      });
    }

    const emptyCart = await getOrCreateHydratedCartByToken(cartToken);

    return NextResponse.json({
      ok: true,
      cart: emptyCart,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to clear cart.",
      500
    );
  }
}