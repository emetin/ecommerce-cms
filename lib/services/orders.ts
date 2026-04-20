import {
  appendOrder,
  appendOrderItems,
  getCartById,
  getCartByToken,
  getCartItems,
  getCustomerById,
  getOrderByCartId,
  updateCartStatus,
} from "../commerce/sheets";

import type {
  Cart,
  CartItem,
  CreateOrderInput,
  CreateOrderResult,
  Order,
  OrderItem,
} from "../commerce/types";

function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${y}${m}${d}-${rand}`;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertCartUsable(cart: Cart | null): asserts cart is Cart {
  if (!cart) {
    throw new Error("Cart not found.");
  }

  if (!cart.id) {
    throw new Error("Cart is invalid.");
  }

  if (cart.status === "converted") {
    throw new Error("This cart has already been converted to an order.");
  }

  if (cart.status !== "active") {
    throw new Error(`Cart is not active. Current status: ${cart.status}`);
  }
}

function assertCartItems(items: CartItem[]): asserts items is CartItem[] {
  if (!items.length) {
    throw new Error("Cannot create order from an empty cart.");
  }
}

function calculateTotals(items: CartItem[], cart: Cart) {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + roundMoney(item.unit_price * item.quantity), 0)
  );

  const discountTotal = roundMoney(cart.discount_total || 0);
  const shippingTotal = roundMoney(cart.shipping_total || 0);
  const taxTotal = roundMoney(cart.tax_total || 0);
  const grandTotal = roundMoney(subtotal - discountTotal + shippingTotal + taxTotal);
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return {
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal,
    grandTotal,
    itemCount,
  };
}

export async function createOrderFromCart(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const cart =
    input.cartId?.trim()
      ? await getCartById(input.cartId.trim())
      : input.cartToken?.trim()
      ? await getCartByToken(input.cartToken.trim())
      : null;

  assertCartUsable(cart);

  const existingOrder = await getOrderByCartId(cart.id);
  if (existingOrder) {
    throw new Error(
      `An order already exists for this cart. Order number: ${existingOrder.order_number}`
    );
  }

  const cartItems = await getCartItems(cart.id);
  assertCartItems(cartItems);

  const customer = cart.customer_id
    ? await getCustomerById(cart.customer_id)
    : null;

  const totals = calculateTotals(cartItems, cart);
  const now = new Date().toISOString();

  const orderId = generateId("ord");
  const orderNumber = generateOrderNumber();

  const email = (input.email || customer?.email || "").trim();
  const firstName = (input.firstName || customer?.first_name || "").trim();
  const lastName = (input.lastName || customer?.last_name || "").trim();

  if (!email) throw new Error("Email is required.");
  if (!firstName) throw new Error("First name is required.");
  if (!lastName) throw new Error("Last name is required.");

  const order: Order = {
    id: orderId,
    order_number: orderNumber,
    cart_token: cart.cart_token,
    cart_id: cart.id,
    customer_id: cart.customer_id || "",
    email,
    first_name: firstName,
    last_name: lastName,
    company: (input.company || customer?.company || "").trim(),
    phone: (input.phone || customer?.phone || "").trim(),
    country: (input.country || customer?.country || "").trim(),
    city: (input.city || customer?.city || "").trim(),
    address_line_1: (input.addressLine1 || customer?.address_line_1 || "").trim(),
    address_line_2: (input.addressLine2 || customer?.address_line_2 || "").trim(),
    postal_code: (input.postalCode || customer?.postal_code || "").trim(),
    note: (input.note || cart.note || "").trim(),
    status: "pending",
    currency: cart.currency || customer?.currency || "USD",
    subtotal: totals.subtotal,
    discount_total: totals.discountTotal,
    shipping_total: totals.shippingTotal,
    tax_total: totals.taxTotal,
    grand_total: totals.grandTotal,
    item_count: totals.itemCount,
    created_at: now,
    updated_at: now,
  };

  const orderItems: OrderItem[] = cartItems.map((item) => ({
    id: generateId("orditem"),
    order_id: orderId,
    product_slug: item.product_slug,
    variant_id: item.variant_id || "",
    product_title: item.product_title,
    variant_title: item.variant_title || "",
    sku: item.sku || "",
    image: item.image || "",
    unit_price: roundMoney(item.unit_price),
    compare_at_price: roundMoney(item.compare_at_price || 0),
    quantity: Number(item.quantity || 0),
    line_total: roundMoney(item.unit_price * item.quantity),
    created_at: now,
    updated_at: now,
  }));

  await appendOrder(order);
  await appendOrderItems(orderItems);
  await updateCartStatus(cart.id, "converted");

  return {
    success: true,
    order,
    items: orderItems,
  };
}