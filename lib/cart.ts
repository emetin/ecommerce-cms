import {
  appendSheetRow,
  deleteSheetRowsByField,
  findSheetItemByField,
  findSheetItemsByField,
  findRowNumberByField,
  getSheetData,
  getSheetHeaders,
  updateSheetRowByRowNumber,
} from "./sheets";
import { clampQuantity, multiplyMoney, toMoney, toNumber } from "./money";
import { createId, nowIso } from "./ids";

const CARTS_SHEET = "carts";
const CART_ITEMS_SHEET = "cart_items";

export type CartStatus = "active" | "converted" | "abandoned";

export type CartRecord = {
  id: string;
  cart_token: string;
  customer_id: string;
  status: CartStatus | string;
  currency: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  item_count: string;
  note: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

export type CartItemRecord = {
  id: string;
  cart_id: string;
  product_slug: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  sku: string;
  image: string;
  unit_price: string;
  compare_at_price: string;
  quantity: string;
  line_total: string;
  created_at: string;
  updated_at: string;
};

export type AddCartItemInput = {
  product_slug: string;
  variant_id?: string;
  product_title: string;
  variant_title?: string;
  sku?: string;
  image?: string;
  unit_price: number | string;
  compare_at_price?: number | string;
  quantity?: number;
};

export type HydratedCartItem = CartItemRecord & {
  unit_price_number: number;
  compare_at_price_number: number;
  quantity_number: number;
  line_total_number: number;
};

export type HydratedCart = {
  cart: CartRecord;
  items: HydratedCartItem[];
  totals: {
    subtotal: number;
    discount_total: number;
    shipping_total: number;
    tax_total: number;
    grand_total: number;
    item_count: number;
  };
};

function addDaysIso(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

async function buildRowFromHeaders(
  sheetName: string,
  record: Record<string, unknown>
): Promise<string[]> {
  const headers = await getSheetHeaders(sheetName);

  if (!headers.length) {
    throw new Error(`"${sheetName}" sheet headers could not be found.`);
  }

  return headers.map((header) => {
    const value = record[header];
    return value == null ? "" : String(value);
  });
}

function hydrateCartItem(item: CartItemRecord): HydratedCartItem {
  return {
    ...item,
    unit_price_number: toNumber(item.unit_price),
    compare_at_price_number: toNumber(item.compare_at_price),
    quantity_number: toNumber(item.quantity),
    line_total_number: toNumber(item.line_total),
  };
}

function calculateCartTotals(items: CartItemRecord[]) {
  const subtotal = items.reduce<number>((sum, item) => {
    return sum + toNumber(item.line_total);
  }, 0);

  const itemCount = items.reduce<number>((sum, item) => {
    return sum + toNumber(item.quantity);
  }, 0);

  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = subtotal + shippingTotal + taxTotal - discountTotal;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount_total: Number(discountTotal.toFixed(2)),
    shipping_total: Number(shippingTotal.toFixed(2)),
    tax_total: Number(taxTotal.toFixed(2)),
    grand_total: Number(grandTotal.toFixed(2)),
    item_count: itemCount,
  };
}

export async function getCartByToken(
  cartToken: string
): Promise<CartRecord | null> {
  if (!cartToken?.trim()) {
    return null;
  }

  const cart = await findSheetItemByField<CartRecord>(
    CARTS_SHEET,
    "cart_token",
    cartToken,
    { forceFresh: true, ttlSeconds: 0 }
  );

  return cart;
}

export async function createCart(
  cartToken: string,
  customerId = ""
): Promise<CartRecord> {
  const now = nowIso();

  const record: CartRecord = {
    id: createId("cart"),
    cart_token: cartToken,
    customer_id: customerId,
    status: "active",
    currency: "USD",
    subtotal: "0.00",
    discount_total: "0.00",
    shipping_total: "0.00",
    tax_total: "0.00",
    grand_total: "0.00",
    item_count: "0",
    note: "",
    created_at: now,
    updated_at: now,
    expires_at: addDaysIso(30),
  };

  const row = await buildRowFromHeaders(CARTS_SHEET, record);
  await appendSheetRow(CARTS_SHEET, row);

  return record;
}

export async function getOrCreateCart(
  cartToken: string,
  customerId = ""
): Promise<CartRecord> {
  const existing = await getCartByToken(cartToken);

  if (existing) {
    return existing;
  }

  return createCart(cartToken, customerId);
}

export async function getCartItems(cartId: string): Promise<CartItemRecord[]> {
  if (!cartId?.trim()) {
    return [];
  }

  const items = await findSheetItemsByField<CartItemRecord>(
    CART_ITEMS_SHEET,
    "cart_id",
    cartId,
    { forceFresh: true, ttlSeconds: 0 }
  );

  return items;
}

export async function syncCartTotals(cartId: string): Promise<HydratedCart> {
  const cart = await findSheetItemByField<CartRecord>(CARTS_SHEET, "id", cartId, {
    forceFresh: true,
    ttlSeconds: 0,
  });

  if (!cart) {
    throw new Error("Cart not found.");
  }

  const items = await getCartItems(cartId);
  const totals = calculateCartTotals(items);
  const rowNumber = await findRowNumberByField(CARTS_SHEET, "id", cartId);

  if (!rowNumber) {
    throw new Error("Cart row could not be found.");
  }

  const updatedCart: CartRecord = {
    ...cart,
    subtotal: toMoney(totals.subtotal),
    discount_total: toMoney(totals.discount_total),
    shipping_total: toMoney(totals.shipping_total),
    tax_total: toMoney(totals.tax_total),
    grand_total: toMoney(totals.grand_total),
    item_count: String(totals.item_count),
    updated_at: nowIso(),
  };

  const row = await buildRowFromHeaders(CARTS_SHEET, updatedCart);
  await updateSheetRowByRowNumber(CARTS_SHEET, rowNumber, row);

  return {
    cart: updatedCart,
    items: items.map(hydrateCartItem),
    totals,
  };
}

export async function getHydratedCartByToken(
  cartToken: string
): Promise<HydratedCart | null> {
  const cart = await getCartByToken(cartToken);

  if (!cart) {
    return null;
  }

  const items = await getCartItems(cart.id);
  const totals = calculateCartTotals(items);

  return {
    cart,
    items: items.map(hydrateCartItem),
    totals,
  };
}

export async function addItemToCart(
  cartToken: string,
  input: AddCartItemInput,
  customerId = ""
): Promise<HydratedCart> {
  const cart = await getOrCreateCart(cartToken, customerId);
  const now = nowIso();

  const variantId = String(input.variant_id || "").trim();
  const productSlug = String(input.product_slug || "").trim();

  if (!productSlug) {
    throw new Error("product_slug is required.");
  }

  const quantityToAdd = clampQuantity(input.quantity ?? 1, 1);
  const existingItems = await getCartItems(cart.id);

  const existing = existingItems.find((item) => {
    return (
      String(item.product_slug || "").trim() === productSlug &&
      String(item.variant_id || "").trim() === variantId
    );
  });

  if (existing) {
    const rowNumber = await findRowNumberByField(CART_ITEMS_SHEET, "id", existing.id);

    if (!rowNumber) {
      throw new Error("Existing cart item row could not be found.");
    }

    const nextQuantity = clampQuantity(toNumber(existing.quantity) + quantityToAdd, 1);
    const unitPrice = toNumber(existing.unit_price || input.unit_price);
    const updated: CartItemRecord = {
      ...existing,
      product_title: input.product_title || existing.product_title,
      variant_title: input.variant_title || existing.variant_title,
      sku: input.sku || existing.sku,
      image: input.image || existing.image,
      compare_at_price: toMoney(
        input.compare_at_price ?? existing.compare_at_price ?? 0
      ),
      unit_price: toMoney(unitPrice),
      quantity: String(nextQuantity),
      line_total: toMoney(multiplyMoney(unitPrice, nextQuantity)),
      updated_at: now,
    };

    const row = await buildRowFromHeaders(CART_ITEMS_SHEET, updated);
    await updateSheetRowByRowNumber(CART_ITEMS_SHEET, rowNumber, row);

    return syncCartTotals(cart.id);
  }

  const unitPrice = toNumber(input.unit_price);
  const compareAtPrice = toNumber(input.compare_at_price ?? 0);

  const newItem: CartItemRecord = {
    id: createId("cartitem"),
    cart_id: cart.id,
    product_slug: productSlug,
    variant_id: variantId,
    product_title: String(input.product_title || "").trim(),
    variant_title: String(input.variant_title || "").trim(),
    sku: String(input.sku || "").trim(),
    image: String(input.image || "").trim(),
    unit_price: toMoney(unitPrice),
    compare_at_price: toMoney(compareAtPrice),
    quantity: String(quantityToAdd),
    line_total: toMoney(multiplyMoney(unitPrice, quantityToAdd)),
    created_at: now,
    updated_at: now,
  };

  const row = await buildRowFromHeaders(CART_ITEMS_SHEET, newItem);
  await appendSheetRow(CART_ITEMS_SHEET, row);

  return syncCartTotals(cart.id);
}

export async function updateCartItemQuantity(
  cartToken: string,
  itemId: string,
  quantity: number
): Promise<HydratedCart> {
  const cart = await getCartByToken(cartToken);

  if (!cart) {
    throw new Error("Cart not found.");
  }

  const item = await findSheetItemByField<CartItemRecord>(
    CART_ITEMS_SHEET,
    "id",
    itemId,
    { forceFresh: true, ttlSeconds: 0 }
  );

  if (!item || item.cart_id !== cart.id) {
    throw new Error("Cart item not found.");
  }

  const nextQuantity = Math.floor(quantity);

  if (nextQuantity <= 0) {
    await deleteSheetRowsByField(CART_ITEMS_SHEET, "id", itemId);
    return syncCartTotals(cart.id);
  }

  const rowNumber = await findRowNumberByField(CART_ITEMS_SHEET, "id", itemId);

  if (!rowNumber) {
    throw new Error("Cart item row could not be found.");
  }

  const unitPrice = toNumber(item.unit_price);
  const updated: CartItemRecord = {
    ...item,
    quantity: String(nextQuantity),
    line_total: toMoney(multiplyMoney(unitPrice, nextQuantity)),
    updated_at: nowIso(),
  };

  const row = await buildRowFromHeaders(CART_ITEMS_SHEET, updated);
  await updateSheetRowByRowNumber(CART_ITEMS_SHEET, rowNumber, row);

  return syncCartTotals(cart.id);
}

export async function removeCartItem(
  cartToken: string,
  itemId: string
): Promise<HydratedCart> {
  const cart = await getCartByToken(cartToken);

  if (!cart) {
    throw new Error("Cart not found.");
  }

  const item = await findSheetItemByField<CartItemRecord>(
    CART_ITEMS_SHEET,
    "id",
    itemId,
    { forceFresh: true, ttlSeconds: 0 }
  );

  if (!item || item.cart_id !== cart.id) {
    throw new Error("Cart item not found.");
  }

  await deleteSheetRowsByField(CART_ITEMS_SHEET, "id", itemId);

  return syncCartTotals(cart.id);
}

export async function clearCartByToken(cartToken: string): Promise<HydratedCart | null> {
  const cart = await getCartByToken(cartToken);

  if (!cart) {
    return null;
  }

  await deleteSheetRowsByField(CART_ITEMS_SHEET, "cart_id", cart.id);

  return syncCartTotals(cart.id);
}

export async function getAllCartsRaw() {
  return getSheetData(CARTS_SHEET, { forceFresh: true, ttlSeconds: 0 });
}