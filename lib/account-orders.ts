import { createSupabaseAdminClient } from "./supabase/admin";

export type AccountOrderRow = {
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
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  item_count: number;
  created_at: string;
  updated_at: string;
};

export type AccountOrderItemRow = {
  id: string;
  order_id: string;
  product_slug: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  sku: string;
  image: string;
  unit_price: number;
  compare_at_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
  updated_at: string;
};

type SupabaseOrderRow = {
  id: string;
  order_number: string | null;
  draft_order_id?: string | null;
  customer_company_id: string | null;
  customer_user_id: string | null;
  status: string | null;
  fulfillment_status?: string | null;
  payment_status?: string | null;
  currency: string | null;
  subtotal: number | string | null;
  discount_total: number | string | null;
  shipping_total: number | string | null;
  tax_total: number | string | null;
  grand_total: number | string | null;
  billing_address_json?: Record<string, unknown> | null;
  shipping_address_json?: Record<string, unknown> | null;
  customer_snapshot_json?: Record<string, unknown> | null;
  notes: string | null;
  internal_notes?: string | null;
  placed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
  order_items?: Array<{ id: string }> | null;
};

type SupabaseOrderItemRow = {
  id: string;
  order_id: string;
  product_id?: string | null;
  variant_id: string | null;
  product_title: string | null;
  variant_title: string | null;
  sku: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
  compare_at_price?: number | string | null;
  line_total: number | string | null;
  product_snapshot_json?: Record<string, unknown> | null;
  created_at: string | null;
  updated_at?: string | null;
};

function toStringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function toLowerValue(value: unknown): string {
  return toStringValue(value).toLowerCase();
}

function toNumberValue(value: unknown): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function getObjectValue(source: unknown, key: string) {
  if (!source || typeof source !== "object") return "";

  const record = source as Record<string, unknown>;
  return record[key];
}

function getStringFromObject(source: unknown, key: string) {
  return toStringValue(getObjectValue(source, key));
}

function getLowerFromObject(source: unknown, key: string) {
  return toLowerValue(getObjectValue(source, key));
}

function splitContactName(value: unknown) {
  const fullName = toStringValue(value);
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || "";
  const lastName = parts.join(" ");

  return {
    firstName,
    lastName,
  };
}

function parseOrderRow(row: SupabaseOrderRow): AccountOrderRow {
  const subtotal = toNumberValue(row.subtotal);
  const rawGrandTotal = toNumberValue(row.grand_total);
  const grandTotal = rawGrandTotal > 0 ? rawGrandTotal : subtotal;

  const customerSnapshot =
    row.customer_snapshot_json && typeof row.customer_snapshot_json === "object"
      ? row.customer_snapshot_json
      : {};

  const shippingAddress =
    row.shipping_address_json && typeof row.shipping_address_json === "object"
      ? row.shipping_address_json
      : {};

  const nameParts = splitContactName(
    getStringFromObject(customerSnapshot, "contact_name")
  );

  const firstName =
    getStringFromObject(customerSnapshot, "first_name") || nameParts.firstName;

  const lastName =
    getStringFromObject(customerSnapshot, "last_name") || nameParts.lastName;

  return {
    id: toStringValue(row.id),
    order_number: toStringValue(row.order_number),
    cart_token: "",
    cart_id: "",
    customer_id: toStringValue(row.customer_user_id || row.customer_company_id),
    email: getLowerFromObject(customerSnapshot, "email"),
    first_name: firstName,
    last_name: lastName,
    company: getStringFromObject(customerSnapshot, "company_name"),
    phone: getStringFromObject(customerSnapshot, "phone"),
    country: getStringFromObject(shippingAddress, "country"),
    city: getStringFromObject(shippingAddress, "city"),
    address_line_1: getStringFromObject(shippingAddress, "address_line_1"),
    address_line_2: getStringFromObject(shippingAddress, "address_line_2"),
    postal_code: getStringFromObject(shippingAddress, "postal_code"),
    note: toStringValue(row.notes),
    status: toStringValue(row.status) || "submitted",
    currency: toStringValue(row.currency) || "USD",
    subtotal,
    discount_total: toNumberValue(row.discount_total),
    shipping_total: toNumberValue(row.shipping_total),
    tax_total: toNumberValue(row.tax_total),
    grand_total: grandTotal,
    item_count: Array.isArray(row.order_items)
      ? row.order_items.length
      : 0,
    created_at: toStringValue(row.created_at),
    updated_at: toStringValue(row.updated_at),
  };
}

function parseOrderItemRow(row: SupabaseOrderItemRow): AccountOrderItemRow {
  const quantity = toNumberValue(row.quantity);
  const unitPrice = toNumberValue(row.unit_price);
  const rawLineTotal = toNumberValue(row.line_total);
  const lineTotal = rawLineTotal > 0 ? rawLineTotal : quantity * unitPrice;

  const snapshot =
    row.product_snapshot_json && typeof row.product_snapshot_json === "object"
      ? row.product_snapshot_json
      : {};

  return {
    id: toStringValue(row.id),
    order_id: toStringValue(row.order_id),
    product_slug: getStringFromObject(snapshot, "product_slug"),
    variant_id: toStringValue(row.variant_id),
    product_title: toStringValue(row.product_title),
    variant_title: toStringValue(row.variant_title),
    sku: toStringValue(row.sku),
    image: getStringFromObject(snapshot, "image_url"),
    unit_price: unitPrice,
    compare_at_price:
      toNumberValue(row.compare_at_price) ||
      toNumberValue(getObjectValue(snapshot, "compare_at_price")),
    quantity,
    line_total: lineTotal,
    created_at: toStringValue(row.created_at),
    updated_at: toStringValue(row.updated_at || row.created_at),
  };
}

function canAccessOrder(
  order: SupabaseOrderRow,
  params: {
    customerId?: string;
    customerUserId?: string;
    companyId?: string;
    email?: string;
  }
) {
  const customerId = toStringValue(params.customerId);
  const customerUserId = toStringValue(params.customerUserId);
  const companyId = toStringValue(params.companyId);
  const email = toLowerValue(params.email);

  const rowCustomerUserId = toStringValue(order.customer_user_id);
  const rowCustomerCompanyId = toStringValue(order.customer_company_id);

  const snapshot =
    order.customer_snapshot_json && typeof order.customer_snapshot_json === "object"
      ? order.customer_snapshot_json
      : {};

  const rowEmail = getLowerFromObject(snapshot, "email");

  if (customerUserId && rowCustomerUserId && rowCustomerUserId === customerUserId) {
    return true;
  }

  if (customerId && rowCustomerUserId && rowCustomerUserId === customerId) {
    return true;
  }

  if (companyId && rowCustomerCompanyId && rowCustomerCompanyId === companyId) {
    return true;
  }

  if (customerId && rowCustomerCompanyId && rowCustomerCompanyId === customerId) {
    return true;
  }

  if (email && rowEmail && rowEmail === email) {
    return true;
  }

  return false;
}

export async function getOrdersForCustomer(params: {
  customerId?: string;
  customerUserId?: string;
  companyId?: string;
  email?: string;
}) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      draft_order_id,
      customer_company_id,
      customer_user_id,
      status,
      fulfillment_status,
      payment_status,
      currency,
      subtotal,
      discount_total,
      shipping_total,
      tax_total,
      grand_total,
      billing_address_json,
      shipping_address_json,
      customer_snapshot_json,
      notes,
      internal_notes,
      placed_at,
      cancelled_at,
      created_at,
      updated_at,
      order_items (
        id
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as SupabaseOrderRow[])
    .filter((order) => canAccessOrder(order, params))
    .map(parseOrderRow);
}

export async function getOrderByOrderNumberForCustomer(params: {
  orderNumber: string;
  customerId?: string;
  customerUserId?: string;
  companyId?: string;
  email?: string;
}) {
  const normalizedOrderNumber = toLowerValue(params.orderNumber);

  if (!normalizedOrderNumber) {
    return null;
  }

  const orders = await getOrdersForCustomer({
    customerId: params.customerId,
    customerUserId: params.customerUserId,
    companyId: params.companyId,
    email: params.email,
  });

  return (
    orders.find(
      (order) => toLowerValue(order.order_number) === normalizedOrderNumber
    ) || null
  );
}

export async function getOrderItemsByOrderId(orderId: string) {
  const normalizedOrderId = toStringValue(orderId);

  if (!normalizedOrderId) {
    return [];
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("order_items")
    .select(
      `
      id,
      order_id,
      product_id,
      variant_id,
      product_title,
      variant_title,
      sku,
      quantity,
      unit_price,
      compare_at_price,
      line_total,
      product_snapshot_json,
      created_at,
      updated_at
    `
    )
    .eq("order_id", normalizedOrderId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as SupabaseOrderItemRow[]).map(parseOrderItemRow);
}

export async function getOrderDetailForCustomer(params: {
  orderNumber: string;
  customerId?: string;
  customerUserId?: string;
  companyId?: string;
  email?: string;
}) {
  const order = await getOrderByOrderNumberForCustomer({
    orderNumber: params.orderNumber,
    customerId: params.customerId,
    customerUserId: params.customerUserId,
    companyId: params.companyId,
    email: params.email,
  });

  if (!order) {
    return null;
  }

  const items = await getOrderItemsByOrderId(order.id);

  return {
    order,
    items,
  };
}