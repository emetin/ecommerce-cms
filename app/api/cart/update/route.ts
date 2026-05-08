import { NextResponse } from "next/server";
import { ensureCartToken } from "../../../../lib/cart-cookie";
import {
  getOrCreateHydratedCartByToken,
  updateCartItemQuantity,
} from "../../../../lib/cart";
import { assertValidQuantityRule } from "../../../../lib/cart-rules";
import { getRateLimitKey, rateLimit } from "../../../../lib/rate-limit";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
}

function getItemMinQuantity(item: any) {
  return (
    toPositiveInteger(item?.min_quantity_number, 0) ||
    toPositiveInteger(item?.min_quantity, 0) ||
    1
  );
}

function getItemBoxQuantity(item: any) {
  return (
    toPositiveInteger(item?.box_quantity_number, 0) ||
    toPositiveInteger(item?.box_quantity, 0) ||
    0
  );
}

function getItemCaseQuantity(item: any) {
  return (
    toPositiveInteger(item?.case_quantity_number, 0) ||
    toPositiveInteger(item?.case_quantity, 0) ||
    0
  );
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
  return jsonError("Cart update API only supports POST requests.", 405);
}

export async function POST(req: Request) {
  try {
    const limited = rateLimit({
      key: getRateLimitKey(req, "cart:update"),
      limit: 80,
      windowMs: 60 * 1000,
    });

    if (!limited.ok) {
      return jsonError(
        "Too many cart update requests. Please try again shortly.",
        429
      );
    }

    const cartToken = await ensureCartToken();
    const body = await req.json().catch(() => ({}));

    const itemId = normalizeText(body?.item_id);
    const requestedQuantity = Number(body?.quantity);

    if (!itemId) {
      return jsonError("item_id is required.", 400);
    }

    if (!Number.isFinite(requestedQuantity)) {
      return jsonError("quantity must be a valid number.", 400);
    }

    const currentCart = await getOrCreateHydratedCartByToken(cartToken);
    const currentItem = currentCart.items.find((item) => item.id === itemId);

    if (!currentItem) {
      return NextResponse.json({
        ok: true,
        cart: currentCart,
      });
    }

    if (requestedQuantity <= 0) {
      const cart = await updateCartItemQuantity(cartToken, itemId, 0);

      return NextResponse.json({
        ok: true,
        cart,
      });
    }

    const quantityRule = assertValidQuantityRule({
      quantity: requestedQuantity,
      minQuantity: getItemMinQuantity(currentItem),
      boxQuantity: getItemBoxQuantity(currentItem),
      caseQuantity: getItemCaseQuantity(currentItem),
    });

    const cart = await updateCartItemQuantity(
      cartToken,
      itemId,
      quantityRule.quantity
    );

    return NextResponse.json({
      ok: true,
      cart,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to update cart item.",
      500
    );
  }
}