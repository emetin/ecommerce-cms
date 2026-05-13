import {
  appendSheetRow,
  deleteSheetRowByField,
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

const CART_LOOKUP_TTL_SECONDS = 15;

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

  min_quantity?: string;
  box_quantity?: string;
  case_quantity?: string;
  step_quantity?: string;

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

  min_quantity?: number | string;
  box_quantity?: number | string;
  case_quantity?: number | string;
  step_quantity?: number | string;
};

export type HydratedCartItem = CartItemRecord & {
  unit_price_number: number;
  compare_at_price_number: number;
  quantity_number: number;
  line_total_number: number;
  min_quantity_number: number;
  box_quantity_number: number;
  case_quantity_number: number;
  step_quantity_number: number;
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

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
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

function addDaysIso(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

function isActiveCart(cart: CartRecord | null) {
  if (!cart) return false;

  const status = normalizeLower(cart.status || "active");

  return !status || status === "active";
}

function getInputMinQuantity(input: AddCartItemInput) {
  return toPositiveInteger(input.min_quantity, 1);
}

function getInputBoxQuantity(input: AddCartItemInput) {
  return toPositiveInteger(input.box_quantity, 0);
}

function getInputCaseQuantity(input: AddCartItemInput) {
  return toPositiveInteger(input.case_quantity, 0);
}

function getInputStepQuantity(input: AddCartItemInput) {
  return (
    toPositiveInteger(input.step_quantity, 0) ||
    getInputCaseQuantity(input) ||
    getInputBoxQuantity(input) ||
    getInputMinQuantity(input) ||
    1
  );
}

function getResolvedQuantityRules(input: AddCartItemInput) {
  const minQuantity = getInputMinQuantity(input);
  const boxQuantity = getInputBoxQuantity(input);
  const caseQuantity = getInputCaseQuantity(input);
  const stepQuantity = getInputStepQuantity(input);

  return {
    min_quantity: String(minQuantity),
    box_quantity: boxQuantity > 0 ? String(boxQuantity) : "",
    case_quantity: caseQuantity > 0 ? String(caseQuantity) : "",
    step_quantity: String(stepQuantity),
  };
}

function preserveOrResolveQuantityRules(
  existing: CartItemRecord,
  input: AddCartItemInput
) {
  const resolved = getResolvedQuantityRules(input);

  return {
    min_quantity: normalizeText(existing.min_quantity) || resolved.min_quantity,
    box_quantity: normalizeText(existing.box_quantity) || resolved.box_quantity,
    case_quantity:
      normalizeText(existing.case_quantity) || resolved.case_quantity,
    step_quantity:
      normalizeText(existing.step_quantity) || resolved.step_quantity,
  };
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
    min_quantity_number: toPositiveInteger(item.min_quantity, 0),
    box_quantity_number: toPositiveInteger(item.box_quantity, 0),
    case_quantity_number: toPositiveInteger(item.case_quantity, 0),
    step_quantity_number: toPositiveInteger(item.step_quantity, 0),
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

function createHydratedCart(
  cart: CartRecord,
  items: CartItemRecord[]
): HydratedCart {
  const totals = calculateCartTotals(items);

  return {
    cart: {
      ...cart,
      subtotal: toMoney(totals.subtotal),
      discount_total: toMoney(totals.discount_total),
      shipping_total: toMoney(totals.shipping_total),
      tax_total: toMoney(totals.tax_total),
      grand_total: toMoney(totals.grand_total),
      item_count: String(totals.item_count),
    },
    items: items.map(hydrateCartItem),
    totals,
  };
}

async function updateCartTotalsFromItems(
  cart: CartRecord,
  items: CartItemRecord[]
): Promise<HydratedCart> {
  const totals = calculateCartTotals(items);

  const rowNumber = await findRowNumberByField(CARTS_SHEET, "id", cart.id);

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

export async function getCartByToken(
  cartToken: string
): Promise<CartRecord | null> {
  const normalizedCartToken = normalizeText(cartToken);

  if (!normalizedCartToken) {
    return null;
  }

  const cartRaw = await findSheetItemByField(
    CARTS_SHEET,
    "cart_token",
    normalizedCartToken,
    {
      forceFresh: false,
      ttlSeconds: CART_LOOKUP_TTL_SECONDS,
    }
  );

  return (cartRaw as CartRecord | null) || null;
}

export async function createCart(
  cartToken: string,
  customerId = ""
): Promise<CartRecord> {
  const normalizedCartToken = normalizeText(cartToken);

  if (!normalizedCartToken) {
    throw new Error("cart_token is required.");
  }

  const now = nowIso();

  const record: CartRecord = {
    id: createId("cart"),
    cart_token: normalizedCartToken,
    customer_id: normalizeText(customerId),
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
  const normalizedCartToken = normalizeText(cartToken);

  if (!normalizedCartToken) {
    throw new Error("cart_token is required.");
  }

  const existing = await getCartByToken(normalizedCartToken);

  if (isActiveCart(existing)) {
    return existing as CartRecord;
  }

  return createCart(normalizedCartToken, customerId);
}

export async function getCartItems(cartId: string): Promise<CartItemRecord[]> {
  const normalizedCartId = normalizeText(cartId);

  if (!normalizedCartId) {
    return [];
  }

  const itemsRaw = await findSheetItemsByField(
    CART_ITEMS_SHEET,
    "cart_id",
    normalizedCartId,
    {
      forceFresh: false,
      ttlSeconds: CART_LOOKUP_TTL_SECONDS,
    }
  );

  return (itemsRaw as CartItemRecord[]) || [];
}

export async function syncCartTotals(cartId: string): Promise<HydratedCart> {
  const normalizedCartId = normalizeText(cartId);

  if (!normalizedCartId) {
    throw new Error("cart_id is required.");
  }

  const cartRaw = await findSheetItemByField(CARTS_SHEET, "id", normalizedCartId, {
    forceFresh: true,
    ttlSeconds: 0,
  });

  const cart = cartRaw as CartRecord | null;

  if (!cart) {
    throw new Error("Cart not found.");
  }

  const items = await getCartItems(normalizedCartId);

  return updateCartTotalsFromItems(cart, items);
}

export async function getHydratedCartByToken(
  cartToken: string
): Promise<HydratedCart | null> {
  const cart = await getCartByToken(cartToken);

  if (!isActiveCart(cart)) {
    return null;
  }

  const activeCart = cart as CartRecord;
  const items = await getCartItems(activeCart.id);

  return createHydratedCart(activeCart, items);
}

export async function getOrCreateHydratedCartByToken(
  cartToken: string,
  customerId = ""
): Promise<HydratedCart> {
  const cart = await getOrCreateCart(cartToken, customerId);
  const items = await getCartItems(cart.id);

  return createHydratedCart(cart, items);
}

export async function addItemToCart(
  cartToken: string,
  input: AddCartItemInput,
  customerId = ""
): Promise<HydratedCart> {
  const normalizedCartToken = normalizeText(cartToken);

  if (!normalizedCartToken) {
    throw new Error("cart_token is required.");
  }

  const productSlug = normalizeText(input.product_slug);
  const variantId = normalizeText(input.variant_id);

  if (!productSlug) {
    throw new Error("product_slug is required.");
  }

  const cart = await getOrCreateCart(normalizedCartToken, customerId);
  const now = nowIso();

  const quantityToAdd = clampQuantity(input.quantity ?? 1, 1);
  const unitPrice = toNumber(input.unit_price);
  const compareAtPrice = toNumber(input.compare_at_price ?? 0);

  if (unitPrice < 0) {
    throw new Error("unit_price cannot be negative.");
  }

  const existingItems = await getCartItems(cart.id);

  const existing = existingItems.find((item) => {
    return (
      normalizeText(item.product_slug) === productSlug &&
      normalizeText(item.variant_id) === variantId
    );
  });

  if (existing) {
    const rowNumber = await findRowNumberByField(
      CART_ITEMS_SHEET,
      "id",
      existing.id
    );

    if (!rowNumber) {
      throw new Error("Existing cart item row could not be found.");
    }

    const nextQuantity = clampQuantity(
      toNumber(existing.quantity) + quantityToAdd,
      1
    );

    const quantityRules = preserveOrResolveQuantityRules(existing, input);

    const updated: CartItemRecord = {
      ...existing,
      product_title: normalizeText(input.product_title || existing.product_title),
      variant_title: normalizeText(input.variant_title || existing.variant_title),
      sku: normalizeText(input.sku || existing.sku),
      image: normalizeText(input.image || existing.image),
      unit_price: toMoney(unitPrice),
      compare_at_price: toMoney(compareAtPrice),
      quantity: String(nextQuantity),
      line_total: toMoney(multiplyMoney(unitPrice, nextQuantity)),
      min_quantity: quantityRules.min_quantity,
      box_quantity: quantityRules.box_quantity,
      case_quantity: quantityRules.case_quantity,
      step_quantity: quantityRules.step_quantity,
      updated_at: now,
    };

    const row = await buildRowFromHeaders(CART_ITEMS_SHEET, updated);
    await updateSheetRowByRowNumber(CART_ITEMS_SHEET, rowNumber, row);

    const nextItems = existingItems.map((item) =>
      item.id === existing.id ? updated : item
    );

    return updateCartTotalsFromItems(cart, nextItems);
  }

  const quantityRules = getResolvedQuantityRules(input);

  const newItem: CartItemRecord = {
    id: createId("cartitem"),
    cart_id: cart.id,
    product_slug: productSlug,
    variant_id: variantId,
    product_title: normalizeText(input.product_title),
    variant_title: normalizeText(input.variant_title),
    sku: normalizeText(input.sku),
    image: normalizeText(input.image),
    unit_price: toMoney(unitPrice),
    compare_at_price: toMoney(compareAtPrice),
    quantity: String(quantityToAdd),
    line_total: toMoney(multiplyMoney(unitPrice, quantityToAdd)),
    min_quantity: quantityRules.min_quantity,
    box_quantity: quantityRules.box_quantity,
    case_quantity: quantityRules.case_quantity,
    step_quantity: quantityRules.step_quantity,
    created_at: now,
    updated_at: now,
  };

  const row = await buildRowFromHeaders(CART_ITEMS_SHEET, newItem);
  await appendSheetRow(CART_ITEMS_SHEET, row);

  return updateCartTotalsFromItems(cart, [...existingItems, newItem]);
}

export async function updateCartItemQuantity(
  cartToken: string,
  itemId: string,
  quantity: number
): Promise<HydratedCart> {
  const normalizedCartToken = normalizeText(cartToken);
  const normalizedItemId = normalizeText(itemId);

  if (!normalizedCartToken) {
    throw new Error("cart_token is required.");
  }

  if (!normalizedItemId) {
    throw new Error("item_id is required.");
  }

  const cart = await getCartByToken(normalizedCartToken);

  if (!isActiveCart(cart)) {
    const fallbackCart = await getOrCreateCart(normalizedCartToken);
    return createHydratedCart(fallbackCart, []);
  }

  const activeCart = cart as CartRecord;

  const existingItems = await getCartItems(activeCart.id);
  const item = existingItems.find(
    (cartItem) => normalizeText(cartItem.id) === normalizedItemId
  );

  if (!item) {
    return updateCartTotalsFromItems(activeCart, existingItems);
  }

  const nextQuantity = Math.floor(Number(quantity));

  if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
    await deleteSheetRowByField(CART_ITEMS_SHEET, "id", normalizedItemId);

    const nextItems = existingItems.filter(
      (cartItem) => normalizeText(cartItem.id) !== normalizedItemId
    );

    return updateCartTotalsFromItems(activeCart, nextItems);
  }

  const rowNumber = await findRowNumberByField(
    CART_ITEMS_SHEET,
    "id",
    normalizedItemId
  );

  if (!rowNumber) {
    return updateCartTotalsFromItems(activeCart, existingItems);
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

  const nextItems = existingItems.map((cartItem) =>
    cartItem.id === item.id ? updated : cartItem
  );

  return updateCartTotalsFromItems(activeCart, nextItems);
}

export async function removeCartItem(
  cartToken: string,
  itemId: string
): Promise<HydratedCart> {
  const normalizedCartToken = normalizeText(cartToken);
  const normalizedItemId = normalizeText(itemId);

  if (!normalizedCartToken) {
    throw new Error("cart_token is required.");
  }

  if (!normalizedItemId) {
    throw new Error("item_id is required.");
  }

  const cart = await getCartByToken(normalizedCartToken);

  if (!isActiveCart(cart)) {
    const fallbackCart = await getOrCreateCart(normalizedCartToken);
    return createHydratedCart(fallbackCart, []);
  }

  const activeCart = cart as CartRecord;
  const existingItems = await getCartItems(activeCart.id);

  const item = existingItems.find(
    (cartItem) => normalizeText(cartItem.id) === normalizedItemId
  );

  if (!item) {
    return updateCartTotalsFromItems(activeCart, existingItems);
  }

  await deleteSheetRowByField(CART_ITEMS_SHEET, "id", normalizedItemId);

  const nextItems = existingItems.filter(
    (cartItem) => normalizeText(cartItem.id) !== normalizedItemId
  );

  return updateCartTotalsFromItems(activeCart, nextItems);
}

export async function clearCartByToken(
  cartToken: string
): Promise<HydratedCart | null> {
  const normalizedCartToken = normalizeText(cartToken);

  if (!normalizedCartToken) {
    return null;
  }

  const cart = await getCartByToken(normalizedCartToken);

  if (!isActiveCart(cart)) {
    return null;
  }

  const activeCart = cart as CartRecord;
  const items = await getCartItems(activeCart.id);

  for (const item of items) {
    await deleteSheetRowByField(CART_ITEMS_SHEET, "id", item.id);
  }

  return updateCartTotalsFromItems(activeCart, []);
}

export async function getAllCartsRaw() {
  return getSheetData(CARTS_SHEET, { forceFresh: true, ttlSeconds: 0 });
}