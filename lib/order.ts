import {
  appendSheetRow,
  findSheetItemByField,
  findSheetItemsByField,
  getSheetHeaders,
  updateSheetRowByRowNumber,
  findRowNumberByField,
  getSheetData,
} from "./sheets";
import { getCartByToken, syncCartTotals } from "./cart";
import { toMoney, toNumber } from "./money";
import { createId, createOrderNumber, nowIso } from "./ids";
import { findCustomerByEmail, findCustomerById } from "./customer-account";

const ORDERS_SHEET = "orders";
const ORDER_ITEMS_SHEET = "order_items";

export type OrderStatus =
  | "pending"
  | "submitted"
  | "reviewing"
  | "quoted"
  | "approved"
  | "cancelled"
  | "paid";

export type OrderRecord = {
  id: string;
  order_number: string;
  cart_token: string;
  cart_id: string;
  customer_id: string;
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
  currency: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  item_count: string;
  created_at: string;
  updated_at: string;
};

export type OrderItemRecord = {
  id: string;
  order_id: string;
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

export type CreateOrderInput = {
  customer_id?: string;
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

function normalize(value?: string | number) {
  return String(value ?? "").trim();
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

async function resolveCustomerContext(input: {
  customer_id?: string;
  email?: string;
}) {
  const customerId = normalize(input.customer_id);
  const email = normalize(input.email).toLowerCase();

  if (customerId) {
    const customer = await findCustomerById(customerId);

    if (customer) {
      return customer;
    }
  }

  if (email) {
    const customer = await findCustomerByEmail(email);

    if (customer) {
      return customer;
    }
  }

  return null;
}

export async function createOrderFromCartToken(
  cartToken: string,
  input: CreateOrderInput
) {
  const normalizedCartToken = normalize(cartToken);

  if (!normalizedCartToken) {
    throw new Error("Cart token not found.");
  }

  const cart = await getCartByToken(normalizedCartToken);

  if (!cart) {
    throw new Error("Cart not found.");
  }

  const hydratedCart = await syncCartTotals(cart.id);
  const cartItems = hydratedCart.items || [];

  if (!cartItems.length) {
    throw new Error("Your cart is empty.");
  }

  const email = normalize(input.email).toLowerCase();

  if (!email) {
    throw new Error("Email is required.");
  }

  const resolvedCustomer = await resolveCustomerContext({
    customer_id: input.customer_id,
    email,
  });

  const now = nowIso();

  const orderRecord: OrderRecord = {
    id: createId("order"),
    order_number: createOrderNumber(),
    cart_token: normalizedCartToken,
    cart_id: cart.id,
    customer_id: normalize(resolvedCustomer?.id),
    email,
    first_name:
      normalize(input.first_name) || normalize(resolvedCustomer?.first_name),
    last_name:
      normalize(input.last_name) || normalize(resolvedCustomer?.last_name),
    company: normalize(input.company) || normalize(resolvedCustomer?.company),
    phone: normalize(input.phone) || normalize(resolvedCustomer?.phone),
    country: normalize(input.country),
    city: normalize(input.city),
    address_line_1: normalize(input.address_line_1),
    address_line_2: normalize(input.address_line_2),
    postal_code: normalize(input.postal_code),
    note: normalize(input.note),
    status: "submitted",
    currency: normalize(cart.currency) || "USD",
    subtotal: toMoney(hydratedCart.totals.subtotal),
    discount_total: toMoney(hydratedCart.totals.discount_total),
    shipping_total: toMoney(hydratedCart.totals.shipping_total),
    tax_total: toMoney(hydratedCart.totals.tax_total),
    grand_total: toMoney(hydratedCart.totals.grand_total),
    item_count: String(hydratedCart.totals.item_count),
    created_at: now,
    updated_at: now,
  };

  const orderRow = await buildRowFromHeaders(ORDERS_SHEET, orderRecord);
  await appendSheetRow(ORDERS_SHEET, orderRow);

  for (const cartItem of cartItems) {
    const orderItem: OrderItemRecord = {
      id: createId("orderitem"),
      order_id: orderRecord.id,
      product_slug: normalize(cartItem.product_slug),
      variant_id: normalize(cartItem.variant_id),
      product_title: normalize(cartItem.product_title),
      variant_title: normalize(cartItem.variant_title),
      sku: normalize(cartItem.sku),
      image: normalize(cartItem.image),
      unit_price: toMoney(cartItem.unit_price),
      compare_at_price: toMoney(cartItem.compare_at_price),
      quantity: String(toNumber(cartItem.quantity)),
      line_total: toMoney(cartItem.line_total),
      created_at: now,
      updated_at: now,
    };

    const orderItemRow = await buildRowFromHeaders(ORDER_ITEMS_SHEET, orderItem);
    await appendSheetRow(ORDER_ITEMS_SHEET, orderItemRow);
  }

  const cartRowNumber = await findRowNumberByField("carts", "id", cart.id);

  if (cartRowNumber) {
    const updatedCart = {
      ...cart,
      status: "converted",
      updated_at: nowIso(),
    };

    const cartRow = await buildRowFromHeaders("carts", updatedCart);
    await updateSheetRowByRowNumber("carts", cartRowNumber, cartRow);
  }

  return {
    order: orderRecord,
    items: cartItems,
  };
}

export async function getOrderByNumber(orderNumber: string) {
  const normalizedOrderNumber = normalize(orderNumber);

  if (!normalizedOrderNumber) {
    return null;
  }

  const order = await findSheetItemByField<OrderRecord>(
    ORDERS_SHEET,
    "order_number",
    normalizedOrderNumber,
    { forceFresh: true, ttlSeconds: 0 }
  );

  if (!order) {
    return null;
  }

  const items = await findSheetItemsByField<OrderItemRecord>(
    ORDER_ITEMS_SHEET,
    "order_id",
    order.id,
    { forceFresh: true, ttlSeconds: 0 }
  );

  return {
    order,
    items,
  };
}

export async function getAllOrders(): Promise<OrderRecord[]> {
  const rows = (await getSheetData(ORDERS_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  })) as OrderRecord[];

  return [...rows].sort((a, b) => {
    return (
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    );
  });
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

  const order = await findSheetItemByField<OrderRecord>(
    ORDERS_SHEET,
    "order_number",
    normalizedOrderNumber,
    { forceFresh: true, ttlSeconds: 0 }
  );

  if (!order) {
    throw new Error("Order not found.");
  }

  const rowNumber = await findRowNumberByField(
    ORDERS_SHEET,
    "order_number",
    normalizedOrderNumber
  );

  if (!rowNumber) {
    throw new Error("Order row could not be found.");
  }

  const updatedOrder: OrderRecord = {
    ...order,
    status: nextStatus,
    updated_at: nowIso(),
  };

  const row = await buildRowFromHeaders(ORDERS_SHEET, updatedOrder);
  await updateSheetRowByRowNumber(ORDERS_SHEET, rowNumber, row);

  const items = await findSheetItemsByField<OrderItemRecord>(
    ORDER_ITEMS_SHEET,
    "order_id",
    order.id,
    { forceFresh: true, ttlSeconds: 0 }
  );

  return {
    order: updatedOrder,
    items,
  };
}

export async function getOrderByCartId(cartId: string) {
  const normalizedCartId = normalize(cartId);

  if (!normalizedCartId) {
    return null;
  }

  const order = await findSheetItemByField<OrderRecord>(
    ORDERS_SHEET,
    "cart_id",
    normalizedCartId,
    { forceFresh: true, ttlSeconds: 0 }
  );

  if (!order) {
    return null;
  }

  const items = await findSheetItemsByField<OrderItemRecord>(
    ORDER_ITEMS_SHEET,
    "order_id",
    order.id,
    { forceFresh: true, ttlSeconds: 0 }
  );

  return {
    order,
    items,
  };
}

export async function createPaidOrderFromCartToken(
  cartToken: string,
  input: CreateOrderInput & {
    paid_status?: string;
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

  const hydratedCart = await syncCartTotals(cart.id);
  const cartItems = hydratedCart.items || [];

  if (!cartItems.length) {
    throw new Error("Your cart is empty.");
  }

  const email = normalize(input.email).toLowerCase();

  if (!email) {
    throw new Error("Email is required.");
  }

  const resolvedCustomer = await resolveCustomerContext({
    customer_id: input.customer_id,
    email,
  });

  const now = nowIso();
  const finalStatus = normalize(input.paid_status) || "paid";

  const orderRecord: OrderRecord = {
    id: createId("order"),
    order_number: createOrderNumber(),
    cart_token: normalizedCartToken,
    cart_id: cart.id,
    customer_id: normalize(resolvedCustomer?.id),
    email,
    first_name:
      normalize(input.first_name) || normalize(resolvedCustomer?.first_name),
    last_name:
      normalize(input.last_name) || normalize(resolvedCustomer?.last_name),
    company: normalize(input.company) || normalize(resolvedCustomer?.company),
    phone: normalize(input.phone) || normalize(resolvedCustomer?.phone),
    country: normalize(input.country),
    city: normalize(input.city),
    address_line_1: normalize(input.address_line_1),
    address_line_2: normalize(input.address_line_2),
    postal_code: normalize(input.postal_code),
    note: normalize(input.note),
    status: finalStatus,
    currency: normalize(cart.currency) || "USD",
    subtotal: toMoney(hydratedCart.totals.subtotal),
    discount_total: toMoney(hydratedCart.totals.discount_total),
    shipping_total: toMoney(hydratedCart.totals.shipping_total),
    tax_total: toMoney(hydratedCart.totals.tax_total),
    grand_total: toMoney(hydratedCart.totals.grand_total),
    item_count: String(hydratedCart.totals.item_count),
    created_at: now,
    updated_at: now,
  };

  const orderRow = await buildRowFromHeaders(ORDERS_SHEET, orderRecord);
  await appendSheetRow(ORDERS_SHEET, orderRow);

  for (const cartItem of cartItems) {
    const orderItem: OrderItemRecord = {
      id: createId("orderitem"),
      order_id: orderRecord.id,
      product_slug: normalize(cartItem.product_slug),
      variant_id: normalize(cartItem.variant_id),
      product_title: normalize(cartItem.product_title),
      variant_title: normalize(cartItem.variant_title),
      sku: normalize(cartItem.sku),
      image: normalize(cartItem.image),
      unit_price: toMoney(cartItem.unit_price),
      compare_at_price: toMoney(cartItem.compare_at_price),
      quantity: String(toNumber(cartItem.quantity)),
      line_total: toMoney(cartItem.line_total),
      created_at: now,
      updated_at: now,
    };

    const orderItemRow = await buildRowFromHeaders(ORDER_ITEMS_SHEET, orderItem);
    await appendSheetRow(ORDER_ITEMS_SHEET, orderItemRow);
  }

  const cartRowNumber = await findRowNumberByField("carts", "id", cart.id);

  if (cartRowNumber) {
    const updatedCart = {
      ...cart,
      status: "converted",
      updated_at: nowIso(),
    };

    const cartRow = await buildRowFromHeaders("carts", updatedCart);
    await updateSheetRowByRowNumber("carts", cartRowNumber, cartRow);
  }

  return {
    order: orderRecord,
    items: cartItems,
  };
}