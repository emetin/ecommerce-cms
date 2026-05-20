import { createSupabaseAdminClient } from "./supabase/admin";
import { toMoney, toNumber } from "./money";

export type AdminOrderStatus =
  | "submitted"
  | "reviewing"
  | "quoted"
  | "approved"
  | "processing"
  | "completed"
  | "cancelled"
  | "paid";

export type AdminPaymentStatus =
  | "pending"
  | "awaiting_payment"
  | "partially_paid"
  | "paid"
  | "refunded"
  | "cancelled";

export type AdminFulfillmentStatus =
  | "unfulfilled"
  | "partial"
  | "fulfilled"
  | "cancelled";

type OrderDbRow = Record<string, any>;
type OrderItemDbRow = Record<string, any>;

export type AdminOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_slug: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  sku: string;
  image: string;
  quantity: string;
  unit_price: string;
  box_quantity: string;
  line_total: string;
  created_at: string;
  updated_at: string;
};

export type AdminOrder = {
  id: string;
  order_number: string;
  customer_company_id: string;
  customer_user_id: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  currency: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  item_count: string;
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
  notes: string;
  internal_notes: string;
  placed_at: string;
  created_at: string;
  updated_at: string;
  billing_address_json: Record<string, unknown>;
  shipping_address_json: Record<string, unknown>;
  customer_snapshot_json: Record<string, unknown>;
  meta_json: Record<string, unknown>;
};

export type AdminOrderDetail = {
  order: AdminOrder;
  items: AdminOrderItem[];
};

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function getMetaValue(meta: Record<string, unknown> | null | undefined, key: string) {
  return normalize(meta?.[key]);
}

function mapOrderItem(row: OrderItemDbRow): AdminOrderItem {
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
    quantity: normalize(row.quantity),
    unit_price: toMoney(row.unit_price),
    box_quantity: normalize(row.box_quantity),
    line_total: toMoney(row.line_total),
    created_at: normalize(row.created_at),
    updated_at: normalize(row.updated_at),
  };
}

function mapOrder(row: OrderDbRow, items: AdminOrderItem[] = []): AdminOrder {
  const shipping = row.shipping_address_json || {};
  const customer = row.customer_snapshot_json || {};
  const meta = row.meta_json || {};

  const itemCount =
    Number(meta.item_count || 0) ||
    items.reduce((sum, item) => sum + toNumber(item.quantity), 0);

  return {
    id: normalize(row.id),
    order_number: normalize(row.order_number),
    customer_company_id: normalize(row.customer_company_id),
    customer_user_id: normalize(row.customer_user_id),
    status: normalize(row.status),
    payment_status: normalize(row.payment_status),
    fulfillment_status: normalize(row.fulfillment_status),
    currency: normalize(row.currency || "USD") || "USD",
    subtotal: toMoney(row.subtotal),
    discount_total: toMoney(row.discount_total),
    shipping_total: toMoney(row.shipping_total),
    tax_total: toMoney(row.tax_total),
    grand_total: toMoney(row.grand_total),
    item_count: String(itemCount),
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
    notes: normalize(row.notes),
    internal_notes: normalize(row.internal_notes),
    placed_at: normalize(row.placed_at),
    created_at: normalize(row.created_at),
    updated_at: normalize(row.updated_at),
    billing_address_json: row.billing_address_json || {},
    shipping_address_json: row.shipping_address_json || {},
    customer_snapshot_json: row.customer_snapshot_json || {},
    meta_json: row.meta_json || {},
  };
}

function calculateGrandTotal(input: {
  subtotal: unknown;
  discount_total: unknown;
  shipping_total: unknown;
  tax_total: unknown;
}) {
  const subtotal = toNumber(input.subtotal);
  const discount = toNumber(input.discount_total);
  const shipping = toNumber(input.shipping_total);
  const tax = toNumber(input.tax_total);

  return Number((subtotal + shipping + tax - discount).toFixed(2));
}

export async function listAdminOrders(options?: {
  status?: string;
  payment_status?: string;
  q?: string;
  limit?: number;
}) {
  const supabase = createSupabaseAdminClient();

  const limit = Math.min(Math.max(Number(options?.limit || 100), 1), 300);
  const status = normalize(options?.status);
  const paymentStatus = normalize(options?.payment_status);
  const q = normalize(options?.q).toLowerCase();

  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  if (paymentStatus) {
    query = query.eq("payment_status", paymentStatus);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  let orders = ((data || []) as OrderDbRow[]).map((row) => mapOrder(row));

  if (q) {
    orders = orders.filter((order) => {
      return [
        order.order_number,
        order.email,
        order.company,
        order.first_name,
        order.last_name,
        order.phone,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }

  return orders;
}

export async function getAdminOrderDetail(orderNumber: string): Promise<AdminOrderDetail | null> {
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

  const items = ((itemsData || []) as OrderItemDbRow[]).map(mapOrderItem);

  return {
    order: mapOrder(orderData as OrderDbRow, items),
    items,
  };
}

export async function updateAdminOrder(input: {
  order_number: string;
  status?: string;
  payment_status?: string;
  fulfillment_status?: string;
  discount_total?: number | string;
  shipping_total?: number | string;
  tax_total?: number | string;
  internal_notes?: string;
}) {
  const orderNumber = normalize(input.order_number);

  if (!orderNumber) {
    throw new Error("order_number is required.");
  }

  const existing = await getAdminOrderDetail(orderNumber);

  if (!existing) {
    throw new Error("Order not found.");
  }

  const order = existing.order;

  const nextDiscount =
    input.discount_total === undefined
      ? toNumber(order.discount_total)
      : toNumber(input.discount_total);

  const nextShipping =
    input.shipping_total === undefined
      ? toNumber(order.shipping_total)
      : toNumber(input.shipping_total);

  const nextTax =
    input.tax_total === undefined ? toNumber(order.tax_total) : toNumber(input.tax_total);

  const nextGrandTotal = calculateGrandTotal({
    subtotal: order.subtotal,
    discount_total: nextDiscount,
    shipping_total: nextShipping,
    tax_total: nextTax,
  });

  const updatePayload: Record<string, unknown> = {
    discount_total: Number(nextDiscount.toFixed(2)),
    shipping_total: Number(nextShipping.toFixed(2)),
    tax_total: Number(nextTax.toFixed(2)),
    grand_total: nextGrandTotal,
    updated_at: nowIso(),
  };

  if (input.status !== undefined) {
    updatePayload.status = normalize(input.status);
  }

  if (input.payment_status !== undefined) {
    updatePayload.payment_status = normalize(input.payment_status);
  }

  if (input.fulfillment_status !== undefined) {
    updatePayload.fulfillment_status = normalize(input.fulfillment_status);
  }

  if (input.internal_notes !== undefined) {
    updatePayload.internal_notes = normalize(input.internal_notes) || null;
  }

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("order_number", orderNumber);

  if (error) {
    throw new Error(error.message);
  }

  const updated = await getAdminOrderDetail(orderNumber);

  if (!updated) {
    throw new Error("Updated order could not be loaded.");
  }

  return updated;
}