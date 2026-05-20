import { createSupabaseAdminClient } from "./supabase/admin";
import {
  getCartByToken,
  getCartItems,
  markCartConverted,
  syncCartTotals,
  type CartItemRecord,
} from "./cart";
import { toMoney, toNumber } from "./money";
import { createOrderNumber } from "./ids";
import { findCustomerByEmail, findCustomerById } from "./customer-account";
import { resolveCartCatalogItem } from "./catalog";
import { assertValidQuantityRule } from "./cart-rules";

export type OrderStatus =
  | "pending"
  | "submitted"
  | "reviewing"
  | "quoted"
  | "approved"
  | "processing"
  | "completed"
  | "cancelled"
  | "paid";

export type OrderRecord = {
  id: string;
  order_number: string;
  cart_token: string;
  cart_id: string;
  customer_id: string;
  customer_company_id: string;
  customer_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  country: string;
  city: string;
  address_line_1: string;
  address_line_2: string;
  postal_code: string;
  note: string;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  currency: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  item_count: string;
  billing_address_json?: Record<string, unknown>;
  shipping_address_json?: Record<string, unknown>;
  customer_snapshot_json?: Record<string, unknown>;
  meta_json?: Record<string, unknown>;
  placed_at: string;
  created_at: string;
  updated_at: string;
};

export type OrderItemRecord = {
  id: string;
  order_id: string;
  product_id: string;
  product_slug: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  sku: string;
  image: string;
  unit_price: string;
  compare_at_price: string;
  box_quantity: string;
  quantity: string;
  line_total: string;
  product_snapshot_json?: Record<string, unknown>;
  meta_json?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreateOrderInput = {
  customer_id?: string;
  customer_company_id?: string;
  customer_user_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
  country?: string;
  city?: string;
  address_line_1?: string;
  address_line_2?: string;
  postal_code?: string;
  note?: string;
};

type OrderDbRow = {
  id: string;
  order_number: string | null;
  draft_order_id: string | null;
  customer_company_id: string | null;
  customer_user_id: string | null;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  currency: string;
  subtotal: number | string;
  discount_total: number | string;
  shipping_total: number | string;
  tax_total: number | string;
  grand_total: number | string;
  billing_address_json: Record<string, unknown> | null;
  shipping_address_json: Record<string, unknown> | null;
  customer_snapshot_json: Record<string, unknown> | null;
  notes: string | null;
  internal_notes: string | null;
  placed_at: string | null;
  cancelled_at: string | null;
  meta_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type OrderItemDbRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_title: string | null;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number | string | null;
  box_quantity: number | null;
  line_total: number | string | null;
  product_snapshot_json: Record<string, unknown> | null;
  meta_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type ValidatedOrderItemInput = {
  product_id: string;
  product_slug: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  sku: string;
  image: string;
  unit_price: number;
  compare_at_price: number;
  box_quantity: number;
  quantity: number;
  line_total: number;
};

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalize(value).toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function assertRequired(value: string, message: string) {
  if (!normalize(value)) {
    throw new Error(message);
  }
}

function toNullableUuid(value: unknown) {
  const normalized = normalize(value);
  return normalized || null;
}

function getMetaValue(
  meta: Record<string, unknown> | null | undefined,
  key: string
) {
  return normalize(meta?.[key]);
}

function buildAddressSnapshot(input: CreateOrderInput) {
  return {
    first_name: normalize(input.first_name),
    last_name: normalize(input.last_name),
    company: normalize(input.company),
    phone: normalize(input.phone),
    country: normalize(input.country),
    city: normalize(input.city),
    address_line_1: normalize(input.address_line_1),
    address_line_2: normalize(input.address_line_2),
    postal_code: normalize(input.postal_code),
  };
}

function buildCustomerSnapshot(input: {
  customerCompanyId: string;
  customerUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
}) {
  return {
    customer_company_id: input.customerCompanyId || null,
    customer_user_id: input.customerUserId || null,
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    company: input.company,
    phone: input.phone,
  };
}

function calculateValidatedTotals(items: ValidatedOrderItemInput[]) {
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

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

async function resolveCustomerContext(input: {
  customer_id?: string;
  customer_company_id?: string;
  customer_user_id?: string;
  email?: string;
}) {
  const explicitCompanyId = normalize(input.customer_company_id);
  const explicitUserId = normalize(input.customer_user_id || input.customer_id);
  const email = normalizeLower(input.email);

  if (explicitUserId) {
    const customer = await findCustomerById(explicitUserId);

    if (customer) {
      return {
        customer,
        customerCompanyId: normalize(customer.company_id || explicitCompanyId),
        customerUserId: normalize(customer.id || explicitUserId),
      };
    }
  }

  if (email) {
    const customer = await findCustomerByEmail(email);

    if (customer) {
      return {
        customer,
        customerCompanyId: normalize(customer.company_id || explicitCompanyId),
        customerUserId: normalize(customer.id || explicitUserId),
      };
    }
  }

  return {
    customer: null,
    customerCompanyId: explicitCompanyId,
    customerUserId: explicitUserId,
  };
}

async function validateCartItemsForQuote(
  cartItems: CartItemRecord[]
): Promise<ValidatedOrderItemInput[]> {
  const validatedItems: ValidatedOrderItemInput[] = [];

  for (const cartItem of cartItems) {
    const productSlug = normalize(cartItem.product_slug);
    const productIdFromCart = normalize(cartItem.product_id);
    const requestedQuantity = toNumber(cartItem.quantity);

    if (!productSlug && !productIdFromCart) {
      throw new Error("A cart item is missing product information.");
    }

    let resolvedProductId = productIdFromCart;
    let resolvedVariantId = normalize(cartItem.variant_id);
    let productTitle = normalize(cartItem.product_title);
    let variantTitle = normalize(cartItem.variant_title);
    let sku = normalize(cartItem.sku);
    let image = normalize(cartItem.image);
    let unitPrice = toNumber(cartItem.unit_price);
    let compareAtPrice = toNumber(cartItem.compare_at_price);
    let boxQuantity = toNumber(cartItem.box_quantity);

    if (productSlug) {
  const resolved = await resolveCartCatalogItem(productSlug, resolvedVariantId);

  resolvedProductId = normalize(
    (resolved.product as any)?.id || resolvedProductId
  );
  resolvedVariantId = normalize(resolved.variantId || resolvedVariantId);
  productTitle = normalize(resolved.productTitle || productTitle);
  variantTitle = normalize(resolved.variantTitle || variantTitle);
  sku = normalize(resolved.sku || sku);
  image = normalize(resolved.image || image);
  unitPrice = toNumber(resolved.unitPrice || unitPrice);
  compareAtPrice = toNumber(resolved.compareAtPrice || compareAtPrice);
  boxQuantity = toNumber(resolved.boxQuantity || boxQuantity);
}

    if (unitPrice <= 0) {
      throw new Error(
        `${productTitle || "Product"} does not have an active price anymore.`
      );
    }

    const quantityRule = assertValidQuantityRule({
      quantity: requestedQuantity,
      boxQuantity,
    });

    const lineTotal = Number((unitPrice * quantityRule.quantity).toFixed(2));

    validatedItems.push({
      product_id: resolvedProductId,
      product_slug: productSlug,
      variant_id: resolvedVariantId,
      product_title: productTitle || "Product",
      variant_title: variantTitle,
      sku,
      image,
      unit_price: unitPrice,
      compare_at_price: compareAtPrice,
      box_quantity: boxQuantity,
      quantity: quantityRule.quantity,
      line_total: lineTotal,
    });
  }

  return validatedItems;
}

function mapOrderItemRow(row: OrderItemDbRow): OrderItemRecord {
  const meta = row.meta_json || {};
  const snapshot = row.product_snapshot_json || {};

  return {
    id: normalize(row.id),
    order_id: normalize(row.order_id),
    product_id: normalize(row.product_id),
    product_slug: getMetaValue(meta, "product_slug"),
    variant_id: normalize(row.variant_id),
    product_title: normalize(row.product_title),
    variant_title: normalize(row.variant_title),
    sku: normalize(row.sku),
    image: getMetaValue(snapshot, "image") || getMetaValue(meta, "image"),
    unit_price: toMoney(row.unit_price),
    compare_at_price: toMoney(snapshot.compare_at_price),
    box_quantity: row.box_quantity ? String(row.box_quantity) : "",
    quantity: String(row.quantity || 0),
    line_total: toMoney(row.line_total),
    product_snapshot_json: snapshot,
    meta_json: meta,
    created_at: normalize(row.created_at),
    updated_at: normalize(row.updated_at),
  };
}

function mapOrderRow(
  row: OrderDbRow,
  items: OrderItemRecord[] = []
): OrderRecord {
  const shipping = row.shipping_address_json || {};
  const customer = row.customer_snapshot_json || {};
  const meta = row.meta_json || {};

  const itemCount =
    Number(meta.item_count || 0) ||
    items.reduce((sum, item) => sum + toNumber(item.quantity), 0);

  return {
    id: normalize(row.id),
    order_number: normalize(row.order_number),
    cart_token: getMetaValue(meta, "cart_token"),
    cart_id: getMetaValue(meta, "cart_id"),
    customer_id: normalize(row.customer_user_id || row.customer_company_id),
    customer_company_id: normalize(row.customer_company_id),
    customer_user_id: normalize(row.customer_user_id),
    email: normalize(customer.email),
    first_name: normalize(customer.first_name || shipping.first_name),
    last_name: normalize(customer.last_name || shipping.last_name),
    company: normalize(customer.company || shipping.company),
    phone: normalize(customer.phone || shipping.phone),
    country: normalize(shipping.country),
    city: normalize(shipping.city),
    address_line_1: normalize(shipping.address_line_1),
    address_line_2: normalize(shipping.address_line_2),
    postal_code: normalize(shipping.postal_code),
    note: normalize(row.notes),
    status: normalize(row.status),
    fulfillment_status: normalize(row.fulfillment_status),
    payment_status: normalize(row.payment_status),
    currency: normalize(row.currency || "USD") || "USD",
    subtotal: toMoney(row.subtotal),
    discount_total: toMoney(row.discount_total),
    shipping_total: toMoney(row.shipping_total),
    tax_total: toMoney(row.tax_total),
    grand_total: toMoney(row.grand_total),
    item_count: String(itemCount),
    billing_address_json: row.billing_address_json || {},
    shipping_address_json: row.shipping_address_json || {},
    customer_snapshot_json: row.customer_snapshot_json || {},
    meta_json: meta,
    placed_at: normalize(row.placed_at),
    created_at: normalize(row.created_at),
    updated_at: normalize(row.updated_at),
  };
}

export async function getOrderByCartId(cartId: string) {
  const normalizedCartId = normalize(cartId);

  if (!normalizedCartId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("meta_json->>cart_id", normalizedCartId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!orderData) {
    return null;
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderData.id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const items = ((itemsData || []) as OrderItemDbRow[]).map(mapOrderItemRow);

  return {
    order: mapOrderRow(orderData as OrderDbRow, items),
    items,
  };
}

async function createOrderFromCartTokenInternal(
  cartToken: string,
  input: CreateOrderInput,
  options?: {
    status?: string;
    paymentStatus?: string;
  }
) {
  const normalizedCartToken = normalize(cartToken);

  if (!normalizedCartToken) {
    throw new Error("Cart token not found.");
  }

  const cart = await getCartByToken(normalizedCartToken);

  if (!cart) {
    throw new Error("Cart not found.");
  }

  const existing = await getOrderByCartId(cart.id);

  if (existing) {
    return existing;
  }

  if (normalizeLower(cart.status) === "converted") {
    throw new Error("This cart has already been converted to a quote request.");
  }

  const hydratedCart = await syncCartTotals(cart.id);
  const cartItems = hydratedCart.items || [];

  if (!cartItems.length) {
    throw new Error("Your quote cart is empty.");
  }

  const email = normalizeLower(input.email);
  const firstName = normalize(input.first_name);
  const lastName = normalize(input.last_name);
  const company = normalize(input.company);
  const phone = normalize(input.phone);
  const country = normalize(input.country);
  const city = normalize(input.city);
  const addressLine1 = normalize(input.address_line_1);
  const addressLine2 = normalize(input.address_line_2);
  const postalCode = normalize(input.postal_code);
  const note = normalize(input.note);

  assertRequired(email, "Email is required.");
  assertRequired(firstName, "First name is required.");
  assertRequired(lastName, "Last name is required.");
  assertRequired(company, "Company is required.");
  assertRequired(phone, "Phone is required.");
  assertRequired(country, "Country is required.");
  assertRequired(city, "City is required.");
  assertRequired(addressLine1, "Address line 1 is required.");

  const validatedItems = await validateCartItemsForQuote(cartItems);

  if (!validatedItems.length) {
    throw new Error("Your quote cart is empty.");
  }

  const totals = calculateValidatedTotals(validatedItems);

  const resolvedCustomer = await resolveCustomerContext({
    customer_id: input.customer_id,
    customer_company_id: input.customer_company_id || cart.customer_company_id,
    customer_user_id: input.customer_user_id || cart.customer_user_id,
    email,
  });

  const customerCompanyId = normalize(
    resolvedCustomer.customerCompanyId || cart.customer_company_id
  );

  const customerUserId = normalize(
    resolvedCustomer.customerUserId || cart.customer_user_id
  );

  const timestamp = nowIso();

  const shippingAddress = buildAddressSnapshot({
    ...input,
    first_name: firstName,
    last_name: lastName,
    company,
    phone,
    country,
    city,
    address_line_1: addressLine1,
    address_line_2: addressLine2,
    postal_code: postalCode,
  });

  const customerSnapshot = buildCustomerSnapshot({
    customerCompanyId,
    customerUserId,
    email,
    firstName,
    lastName,
    company,
    phone,
  });

  const supabase = createSupabaseAdminClient();

  const finalStatus = normalize(options?.status) || "submitted";
  const finalPaymentStatus = normalize(options?.paymentStatus) || "pending";

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: createOrderNumber(),
      draft_order_id: null,
      customer_company_id: toNullableUuid(customerCompanyId),
      customer_user_id: toNullableUuid(customerUserId),
      status: finalStatus,
      fulfillment_status: "unfulfilled",
      payment_status: finalPaymentStatus,
      currency: normalize(cart.currency) || "USD",
      subtotal: totals.subtotal,
      discount_total: totals.discount_total,
      shipping_total: totals.shipping_total,
      tax_total: totals.tax_total,
      grand_total: totals.grand_total,
      billing_address_json: shippingAddress,
      shipping_address_json: shippingAddress,
      customer_snapshot_json: customerSnapshot,
      notes: note || null,
      internal_notes: null,
      placed_at: timestamp,
      cancelled_at: null,
      meta_json: {
        cart_id: cart.id,
        cart_token: normalizedCartToken,
        item_count: totals.item_count,
        source: "website_checkout",
      },
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select("*")
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }

  const orderId = normalize(orderData.id);

  const orderItemPayloads = validatedItems.map((item) => ({
    order_id: orderId,
    product_id: toNullableUuid(item.product_id),
    variant_id: toNullableUuid(item.variant_id),
    product_title: item.product_title,
    variant_title: item.variant_title,
    sku: item.sku,
    quantity: item.quantity,
    unit_price: item.unit_price,
    box_quantity: item.box_quantity || null,
    line_total: item.line_total,
    product_snapshot_json: {
      product_slug: item.product_slug,
      image: item.image,
      compare_at_price: item.compare_at_price,
      product_title: item.product_title,
      variant_title: item.variant_title,
      sku: item.sku,
    },
    meta_json: {
      product_slug: item.product_slug,
      source_cart_id: cart.id,
    },
    created_at: timestamp,
    updated_at: timestamp,
  }));

  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemPayloads)
    .select("*");

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  await markCartConverted(cart.id);

  const items = ((itemsData || []) as OrderItemDbRow[]).map(mapOrderItemRow);

  return {
    order: mapOrderRow(orderData as OrderDbRow, items),
    items,
  };
}

export async function createOrderFromCartToken(
  cartToken: string,
  input: CreateOrderInput
) {
  return createOrderFromCartTokenInternal(cartToken, input, {
    status: "submitted",
    paymentStatus: "pending",
  });
}

export async function createPaidOrderFromCartToken(
  cartToken: string,
  input: CreateOrderInput & {
    paid_status?: string;
  }
) {
  return createOrderFromCartTokenInternal(cartToken, input, {
    status: normalize(input.paid_status) || "paid",
    paymentStatus: "paid",
  });
}

export async function getOrderByNumber(orderNumber: string) {
  const normalizedOrderNumber = normalize(orderNumber);

  if (!normalizedOrderNumber) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", normalizedOrderNumber)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!orderData) {
    return null;
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderData.id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const items = ((itemsData || []) as OrderItemDbRow[]).map(mapOrderItemRow);

  return {
    order: mapOrderRow(orderData as OrderDbRow, items),
    items,
  };
}

export async function getAllOrders(
  _options?: {
    forceFresh?: boolean;
    ttlSeconds?: number;
  }
): Promise<OrderRecord[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as OrderDbRow[]).map((row) => mapOrderRow(row));
}

export async function getOrdersForCustomer(input: {
  customerCompanyId?: string;
  customerUserId?: string;
  customerId?: string;
  email?: string;
}) {
  const customerCompanyId = normalize(input.customerCompanyId);
  const customerUserId = normalize(input.customerUserId || input.customerId);
  const email = normalizeLower(input.email);

  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (customerCompanyId) {
    query = query.eq("customer_company_id", customerCompanyId);
  } else if (customerUserId) {
    query = query.eq("customer_user_id", customerUserId);
  } else if (email) {
    query = query.eq("customer_snapshot_json->>email", email);
  } else {
    return [];
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as OrderDbRow[]).map((row) => mapOrderRow(row));
}

export async function updateOrderStatus(
  orderNumber: string,
  status: OrderStatus | string
) {
  const normalizedOrderNumber = normalize(orderNumber);
  const nextStatus = normalize(status);

  if (!normalizedOrderNumber) {
    throw new Error("order_number is required.");
  }

  if (!nextStatus) {
    throw new Error("status is required.");
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .update({
      status: nextStatus,
      updated_at: nowIso(),
    })
    .eq("order_number", normalizedOrderNumber)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", data.id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const items = ((itemsData || []) as OrderItemDbRow[]).map(mapOrderItemRow);

  return {
    order: mapOrderRow(data as OrderDbRow, items),
    items,
  };
}