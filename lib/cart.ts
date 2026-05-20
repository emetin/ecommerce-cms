import { createSupabaseAdminClient } from "./supabase/admin";
import { multiplyMoney, toMoney, toNumber } from "./money";
import { resolveQuantityRule } from "./cart-rules";

export type CartStatus = "active" | "converted" | "abandoned";

type CustomerContextInput =
  | string
  | {
      customerCompanyId?: string;
      customerUserId?: string;
      currency?: string;
    }
  | undefined;

type CartDbRow = {
  id: string;
  cart_token: string | null;
  customer_company_id: string | null;
  customer_user_id: string | null;
  status: string;
  currency: string;
  subtotal: number | string;
  discount_total: number | string;
  shipping_total: number | string;
  tax_total: number | string;
  grand_total: number | string;
  notes: string | null;
  expires_at: string | null;
  meta_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type CartItemDbRow = {
  id: string;
  cart_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_title: string | null;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number | string | null;
  box_quantity: number | null;
  line_total: number | string | null;
  meta_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type CartRecord = {
  id: string;
  cart_token: string;
  customer_id: string;
  customer_company_id: string;
  customer_user_id: string;
  status: CartStatus | string;
  currency: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  item_count: string;
  note: string;
  notes: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  meta_json?: Record<string, unknown>;
};

export type CartItemRecord = {
  id: string;
  cart_id: string;
  product_id?: string;
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
  meta_json?: Record<string, unknown>;
};

export type AddCartItemInput = {
  product_id?: string;
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

  meta_json?: Record<string, unknown>;
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

function nowIso() {
  return new Date().toISOString();
}

function addDaysIso(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
}

function toNullableUuid(value: unknown) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function isActiveCart(cart: CartRecord | null) {
  if (!cart) return false;

  const status = normalizeLower(cart.status || "active");

  return !status || status === "active";
}

function getMetaValue(
  meta: Record<string, unknown> | null | undefined,
  key: string
) {
  return normalizeText(meta?.[key]);
}

function resolveCustomerContext(input?: CustomerContextInput) {
  if (!input) {
    return {
      customerCompanyId: "",
      customerUserId: "",
      currency: "USD",
    };
  }

  if (typeof input === "string") {
    return {
      customerCompanyId: "",
      customerUserId: normalizeText(input),
      currency: "USD",
    };
  }

  return {
    customerCompanyId: normalizeText(input.customerCompanyId),
    customerUserId: normalizeText(input.customerUserId),
    currency: normalizeText(input.currency || "USD") || "USD",
  };
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

function clampQuantity(value: unknown, fallback = 1) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
}

function getCartItemRuleValue(
  item: CartItemRecord,
  directValue: unknown,
  metaKey: string
): string | number | null | undefined {
  const directText = normalizeText(directValue);

  if (directText) {
    return directText;
  }

  const metaValue = item.meta_json?.[metaKey];
  const metaText = normalizeText(metaValue);

  return metaText || undefined;
}

function resolveCartItemQuantity(item: CartItemRecord, quantity: number) {
  return resolveQuantityRule({
    quantity,
    minQuantity: getCartItemRuleValue(item, item.min_quantity, "min_quantity"),
    boxQuantity: getCartItemRuleValue(item, item.box_quantity, "box_quantity"),
    caseQuantity: getCartItemRuleValue(item, item.case_quantity, "case_quantity"),
    stepQuantity: getCartItemRuleValue(item, item.step_quantity, "step_quantity"),
  });
}

function mapCartRow(row: CartDbRow, itemCount = 0): CartRecord {
  const customerCompanyId = normalizeText(row.customer_company_id);
  const customerUserId = normalizeText(row.customer_user_id);

  return {
    id: normalizeText(row.id),
    cart_token: normalizeText(row.cart_token),
    customer_id: customerUserId || customerCompanyId,
    customer_company_id: customerCompanyId,
    customer_user_id: customerUserId,
    status: normalizeText(row.status || "active"),
    currency: normalizeText(row.currency || "USD") || "USD",
    subtotal: toMoney(row.subtotal),
    discount_total: toMoney(row.discount_total),
    shipping_total: toMoney(row.shipping_total),
    tax_total: toMoney(row.tax_total),
    grand_total: toMoney(row.grand_total),
    item_count: String(itemCount),
    note: normalizeText(row.notes),
    notes: normalizeText(row.notes),
    created_at: normalizeText(row.created_at),
    updated_at: normalizeText(row.updated_at),
    expires_at: normalizeText(row.expires_at),
    meta_json: row.meta_json || {},
  };
}

function mapCartItemRow(row: CartItemDbRow): CartItemRecord {
  const meta = row.meta_json || {};

  return {
    id: normalizeText(row.id),
    cart_id: normalizeText(row.cart_id),
    product_id: normalizeText(row.product_id),
    product_slug: getMetaValue(meta, "product_slug"),
    variant_id: normalizeText(row.variant_id),
    product_title: normalizeText(row.product_title),
    variant_title: normalizeText(row.variant_title),
    sku: normalizeText(row.sku),
    image: getMetaValue(meta, "image"),
    unit_price: toMoney(row.unit_price),
    compare_at_price: toMoney(meta.compare_at_price),
    quantity: String(row.quantity || 0),
    line_total: toMoney(row.line_total),
    min_quantity: getMetaValue(meta, "min_quantity"),
    box_quantity: row.box_quantity
      ? String(row.box_quantity)
      : getMetaValue(meta, "box_quantity"),
    case_quantity: getMetaValue(meta, "case_quantity"),
    step_quantity: getMetaValue(meta, "step_quantity"),
    created_at: normalizeText(row.created_at),
    updated_at: normalizeText(row.updated_at),
    meta_json: meta,
  };
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
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("carts")
    .update({
      subtotal: totals.subtotal,
      discount_total: totals.discount_total,
      shipping_total: totals.shipping_total,
      tax_total: totals.tax_total,
      grand_total: totals.grand_total,
      updated_at: nowIso(),
    })
    .eq("id", cart.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return createHydratedCart(
    mapCartRow(data as CartDbRow, totals.item_count),
    items
  );
}

async function updateCartCustomerContextIfNeeded(
  cart: CartRecord,
  context?: CustomerContextInput
) {
  const resolved = resolveCustomerContext(context);

  if (!resolved.customerCompanyId && !resolved.customerUserId) {
    return cart;
  }

  const shouldUpdateCompany =
    resolved.customerCompanyId && !normalizeText(cart.customer_company_id);

  const shouldUpdateUser =
    resolved.customerUserId && !normalizeText(cart.customer_user_id);

  if (!shouldUpdateCompany && !shouldUpdateUser) {
    return cart;
  }

  const supabase = createSupabaseAdminClient();

  const updatePayload: Record<string, unknown> = {
    updated_at: nowIso(),
  };

  if (shouldUpdateCompany) {
    updatePayload.customer_company_id = resolved.customerCompanyId;
  }

  if (shouldUpdateUser) {
    updatePayload.customer_user_id = resolved.customerUserId;
  }

  const { data, error } = await supabase
    .from("carts")
    .update(updatePayload)
    .eq("id", cart.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCartRow(data as CartDbRow, Number(cart.item_count || 0));
}

export async function getCartByToken(
  cartToken: string
): Promise<CartRecord | null> {
  const normalizedCartToken = normalizeText(cartToken);

  if (!normalizedCartToken) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("carts")
    .select("*")
    .eq("cart_token", normalizedCartToken)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapCartRow(data as CartDbRow) : null;
}

export async function createCart(
  cartToken: string,
  context?: CustomerContextInput
): Promise<CartRecord> {
  const normalizedCartToken = normalizeText(cartToken);

  if (!normalizedCartToken) {
    throw new Error("cart_token is required.");
  }

  const resolved = resolveCustomerContext(context);
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("carts")
    .insert({
      cart_token: normalizedCartToken,
      customer_company_id: toNullableUuid(resolved.customerCompanyId),
      customer_user_id: toNullableUuid(resolved.customerUserId),
      status: "active",
      currency: resolved.currency || "USD",
      subtotal: 0,
      discount_total: 0,
      shipping_total: 0,
      tax_total: 0,
      grand_total: 0,
      notes: null,
      expires_at: addDaysIso(30),
      meta_json: {},
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCartRow(data as CartDbRow);
}

export async function getOrCreateCart(
  cartToken: string,
  context?: CustomerContextInput
): Promise<CartRecord> {
  const normalizedCartToken = normalizeText(cartToken);

  if (!normalizedCartToken) {
    throw new Error("cart_token is required.");
  }

  const existing = await getCartByToken(normalizedCartToken);

  if (isActiveCart(existing)) {
    return updateCartCustomerContextIfNeeded(existing as CartRecord, context);
  }

  return createCart(normalizedCartToken, context);
}

export async function getCartItems(cartId: string): Promise<CartItemRecord[]> {
  const normalizedCartId = normalizeText(cartId);

  if (!normalizedCartId) {
    return [];
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("cart_id", normalizedCartId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as CartItemDbRow[]).map(mapCartItemRow);
}

export async function syncCartTotals(cartId: string): Promise<HydratedCart> {
  const normalizedCartId = normalizeText(cartId);

  if (!normalizedCartId) {
    throw new Error("cart_id is required.");
  }

  const supabase = createSupabaseAdminClient();

  const { data: cartData, error: cartError } = await supabase
    .from("carts")
    .select("*")
    .eq("id", normalizedCartId)
    .maybeSingle();

  if (cartError) {
    throw new Error(cartError.message);
  }

  if (!cartData) {
    throw new Error("Cart not found.");
  }

  const cart = mapCartRow(cartData as CartDbRow);
  const items = await getCartItems(cart.id);

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
  context?: CustomerContextInput
): Promise<HydratedCart> {
  const cart = await getOrCreateCart(cartToken, context);
  const items = await getCartItems(cart.id);

  return createHydratedCart(cart, items);
}

export async function addItemToCart(
  cartToken: string,
  input: AddCartItemInput,
  context?: CustomerContextInput
): Promise<HydratedCart> {
  const normalizedCartToken = normalizeText(cartToken);

  if (!normalizedCartToken) {
    throw new Error("cart_token is required.");
  }

  const productSlug = normalizeText(input.product_slug);
  const productId = normalizeText(input.product_id);
  const variantId = normalizeText(input.variant_id);

  if (!productSlug && !productId) {
    throw new Error("product_slug or product_id is required.");
  }

  const cart = await getOrCreateCart(normalizedCartToken, context);
  const now = nowIso();

  const quantityToAdd = clampQuantity(input.quantity ?? 1, 1);
  const unitPrice = toNumber(input.unit_price);
  const compareAtPrice = toNumber(input.compare_at_price ?? 0);

  if (unitPrice < 0) {
    throw new Error("unit_price cannot be negative.");
  }

  const existingItems = await getCartItems(cart.id);

  const existing = existingItems.find((item) => {
    const normalizedItemVariantId = normalizeText(item.variant_id);
    const normalizedItemProductId = normalizeText(item.product_id);
    const normalizedItemProductSlug = normalizeText(item.product_slug);

    const sameVariant = normalizedItemVariantId === variantId;
    const sameProductId = productId && normalizedItemProductId === productId;
    const sameProductSlug =
      productSlug && normalizedItemProductSlug === productSlug;

    return sameVariant && (sameProductId || sameProductSlug);
  });

  const quantityRules = getResolvedQuantityRules(input);
  const boxQuantity = toPositiveInteger(quantityRules.box_quantity, 0) || null;

  const metaJson = {
    ...(input.meta_json || {}),
    product_slug: productSlug,
    image: normalizeText(input.image),
    compare_at_price: compareAtPrice,
    min_quantity: quantityRules.min_quantity,
    box_quantity: quantityRules.box_quantity,
    case_quantity: quantityRules.case_quantity,
    step_quantity: quantityRules.step_quantity,
  };

  const supabase = createSupabaseAdminClient();

  if (existing) {
    const nextQuantity = clampQuantity(
      toNumber(existing.quantity) + quantityToAdd,
      1
    );

    const quantityRule = resolveCartItemQuantity(existing, nextQuantity);
    const finalQuantity = quantityRule.quantity;
    const lineTotal = multiplyMoney(unitPrice, finalQuantity);

    const { data, error } = await supabase
      .from("cart_items")
      .update({
        product_id: toNullableUuid(productId || existing.product_id),
        variant_id: toNullableUuid(variantId || existing.variant_id),
        product_title: normalizeText(input.product_title || existing.product_title),
        variant_title: normalizeText(
          input.variant_title || existing.variant_title
        ),
        sku: normalizeText(input.sku || existing.sku),
        quantity: finalQuantity,
        unit_price: unitPrice,
        box_quantity: boxQuantity,
        line_total: lineTotal,
        meta_json: {
          ...(existing.meta_json || {}),
          ...metaJson,
        },
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const updated = mapCartItemRow(data as CartItemDbRow);

    const nextItems = existingItems.map((item) =>
      item.id === existing.id ? updated : item
    );

    return updateCartTotalsFromItems(cart, nextItems);
  }

  const quantityRule = resolveQuantityRule({
    quantity: quantityToAdd,
    minQuantity: quantityRules.min_quantity,
    boxQuantity: quantityRules.box_quantity,
    caseQuantity: quantityRules.case_quantity,
    stepQuantity: quantityRules.step_quantity,
  });

  const finalQuantity = quantityRule.quantity;
  const lineTotal = multiplyMoney(unitPrice, finalQuantity);

  const { data, error } = await supabase
    .from("cart_items")
    .insert({
      cart_id: cart.id,
      product_id: toNullableUuid(productId),
      variant_id: toNullableUuid(variantId),
      product_title: normalizeText(input.product_title),
      variant_title: normalizeText(input.variant_title),
      sku: normalizeText(input.sku),
      quantity: finalQuantity,
      unit_price: unitPrice,
      box_quantity: boxQuantity,
      line_total: lineTotal,
      meta_json: metaJson,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const newItem = mapCartItemRow(data as CartItemDbRow);

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
  const supabase = createSupabaseAdminClient();

  if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", normalizedItemId)
      .eq("cart_id", activeCart.id);

    if (error) {
      throw new Error(error.message);
    }

    const nextItems = existingItems.filter(
      (cartItem) => normalizeText(cartItem.id) !== normalizedItemId
    );

    return updateCartTotalsFromItems(activeCart, nextItems);
  }

  const quantityRule = resolveCartItemQuantity(item, nextQuantity);
  const finalQuantity = quantityRule.quantity;

  const unitPrice = toNumber(item.unit_price);
  const lineTotal = multiplyMoney(unitPrice, finalQuantity);

  const { data, error } = await supabase
    .from("cart_items")
    .update({
      quantity: finalQuantity,
      line_total: lineTotal,
      updated_at: nowIso(),
    })
    .eq("id", normalizedItemId)
    .eq("cart_id", activeCart.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const updated = mapCartItemRow(data as CartItemDbRow);

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

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", normalizedItemId)
    .eq("cart_id", activeCart.id);

  if (error) {
    throw new Error(error.message);
  }

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
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_id", activeCart.id);

  if (error) {
    throw new Error(error.message);
  }

  return updateCartTotalsFromItems(activeCart, []);
}

export async function markCartConverted(cartId: string) {
  const normalizedCartId = normalizeText(cartId);

  if (!normalizedCartId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("carts")
    .update({
      status: "converted",
      updated_at: nowIso(),
    })
    .eq("id", normalizedCartId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCartRow(data as CartDbRow);
}

export async function getAllCartsRaw() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("carts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}