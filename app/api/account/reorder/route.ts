import { NextResponse } from "next/server";
import {
  getCartTokenFromCookies,
  ensureCartToken,
} from "../../../../lib/cart-cookie";
import { addItemToCart, clearCartByToken } from "../../../../lib/cart";
import { getOrderByNumber } from "../../../../lib/order";
import { resolveCartCatalogItem } from "../../../../lib/catalog";
import { resolveQuantityRule } from "../../../../lib/cart-rules";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../../../lib/customer-auth";

function getCookieValue(cookieHeader: string, name: string) {
  const match = cookieHeader.match(
    new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
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
  return jsonError("Reorder API only supports POST requests.", 405);
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const customerToken = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);
    const session = await readCustomerFromSessionToken(customerToken);

    if (!session?.customerId && !session?.email) {
      return jsonError("Customer session is required.", 401);
    }

    const body = await req.json().catch(() => ({}));
    const orderNumber = normalizeText(body?.order_number || body?.orderNumber);

    if (!orderNumber) {
      return jsonError("order_number is required.", 400);
    }

    const existingOrder = await getOrderByNumber(orderNumber);

    if (!existingOrder?.order) {
      return jsonError("Order not found.", 404);
    }

    const order = existingOrder.order;
    const orderItems = existingOrder.items || [];

    const sessionCustomerId = normalizeText(session.customerId);
    const sessionEmail = normalizeLower(session.email);

    const orderCustomerId = normalizeText(order.customer_id);
    const orderEmail = normalizeLower(order.email);

    const ownsOrder =
      (sessionCustomerId &&
        orderCustomerId &&
        sessionCustomerId === orderCustomerId) ||
      (sessionEmail && orderEmail && sessionEmail === orderEmail);

    if (!ownsOrder) {
      return jsonError("You do not have permission to reorder this order.", 403);
    }

    if (!orderItems.length) {
      return jsonError("This order does not have reorderable items.", 400);
    }

    const existingCartToken = await getCartTokenFromCookies();

    if (existingCartToken) {
      await clearCartByToken(existingCartToken);
    }

    const cartToken = await ensureCartToken();

    const skippedItems: Array<{
      product_slug: string;
      variant_id: string;
      requested_quantity: number;
      adjusted_quantity?: number;
      reason: string;
    }> = [];

    let addedCount = 0;

    for (const item of orderItems) {
      const productSlug = normalizeText(item.product_slug);
      const variantId = normalizeText(item.variant_id);
      const requestedQuantity = toPositiveInteger(item.quantity, 1);

      if (!productSlug || !variantId) {
        skippedItems.push({
          product_slug: productSlug,
          variant_id: variantId,
          requested_quantity: requestedQuantity,
          reason: "Missing product or variant reference.",
        });
        continue;
      }

      try {
        const resolved = await resolveCartCatalogItem(productSlug, variantId);

        if (!resolved.variant?.id) {
          skippedItems.push({
            product_slug: productSlug,
            variant_id: variantId,
            requested_quantity: requestedQuantity,
            reason: "Variant is no longer available.",
          });
          continue;
        }

        if (resolved.unitPrice <= 0) {
          skippedItems.push({
            product_slug: productSlug,
            variant_id: variantId,
            requested_quantity: requestedQuantity,
            reason: "Product no longer has an active price.",
          });
          continue;
        }

        const quantityRule = resolveQuantityRule({
          quantity: requestedQuantity,
          minQuantity: resolved.minQuantity,
          boxQuantity: resolved.boxQuantity,
          caseQuantity: resolved.caseQuantity,
        });

        await addItemToCart(cartToken, {
          product_slug: productSlug,
          variant_id: resolved.variant.id,
          product_title: resolved.productTitle,
          variant_title: resolved.variantTitle,
          sku: resolved.sku,
          image: resolved.image,
          unit_price: resolved.unitPrice,
          compare_at_price: resolved.compareAtPrice,
          quantity: quantityRule.quantity,
        });

        if (quantityRule.quantity !== requestedQuantity) {
          skippedItems.push({
            product_slug: productSlug,
            variant_id: variantId,
            requested_quantity: requestedQuantity,
            adjusted_quantity: quantityRule.quantity,
            reason:
              "Quantity was adjusted to match the current minimum or pack quantity rule.",
          });
        }

        addedCount += 1;
      } catch (error) {
        skippedItems.push({
          product_slug: productSlug,
          variant_id: variantId,
          requested_quantity: requestedQuantity,
          reason:
            error instanceof Error
              ? error.message
              : "Failed to add item to cart.",
        });
      }
    }

    if (addedCount === 0) {
      return jsonError("No items from this order could be added to cart.", 400);
    }

    return NextResponse.json({
      ok: true,
      message: "Order items were added to your quote cart.",
      added_count: addedCount,
      skipped_count: skippedItems.length,
      skipped_items: skippedItems,
      next_path: "/cart",
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to reorder.",
      500
    );
  }
}