import { google } from "googleapis";

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

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

function requireEnv(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function getAuth() {
  requireEnv("GOOGLE_SHEET_ID", SHEET_ID);
  requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", SERVICE_ACCOUNT_EMAIL);
  requireEnv("GOOGLE_PRIVATE_KEY", PRIVATE_KEY);

  return new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

async function getSheets() {
  const auth = getAuth();
  await auth.authorize();

  return google.sheets({
    version: "v4",
    auth,
  });
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

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

function mapRow(headers: string[], row: unknown[]) {
  const obj: Record<string, unknown> = {};

  headers.forEach((header, index) => {
    obj[header] = row[index] ?? "";
  });

  return obj;
}

async function getSheetValues(sheetName: string): Promise<string[][]> {
  const sheets = await getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID!,
    range: `${sheetName}!A:ZZ`,
  });

  return (response.data.values ?? []) as string[][];
}

function parseOrderRow(row: Record<string, unknown>): AccountOrderRow {
  const subtotal = toNumberValue(row.subtotal);
  const rawGrandTotal = toNumberValue(row.grand_total);
  const grandTotal = rawGrandTotal > 0 ? rawGrandTotal : subtotal;

  return {
    id: toStringValue(row.id),
    order_number: toStringValue(row.order_number),
    cart_token: toStringValue(row.cart_token),
    cart_id: toStringValue(row.cart_id),
    customer_id: toStringValue(row.customer_id),
    email: toLowerValue(row.email),
    first_name: toStringValue(row.first_name),
    last_name: toStringValue(row.last_name),
    company: toStringValue(row.company),
    phone: toStringValue(row.phone),
    country: toStringValue(row.country),
    city: toStringValue(row.city),
    address_line_1: toStringValue(row.address_line_1),
    address_line_2: toStringValue(row.address_line_2),
    postal_code: toStringValue(row.postal_code),
    note: toStringValue(row.note),
    status: toStringValue(row.status) || "submitted",
    currency: toStringValue(row.currency) || "USD",
    subtotal,
    discount_total: toNumberValue(row.discount_total),
    shipping_total: toNumberValue(row.shipping_total),
    tax_total: toNumberValue(row.tax_total),
    grand_total: grandTotal,
    item_count: toNumberValue(row.item_count),
    created_at: toStringValue(row.created_at),
    updated_at: toStringValue(row.updated_at),
  };
}

function parseOrderItemRow(row: Record<string, unknown>): AccountOrderItemRow {
  const quantity = toNumberValue(row.quantity);
  const unitPrice = toNumberValue(row.unit_price);
  const rawLineTotal = toNumberValue(row.line_total);
  const lineTotal = rawLineTotal > 0 ? rawLineTotal : quantity * unitPrice;

  return {
    id: toStringValue(row.id),
    order_id: toStringValue(row.order_id),
    product_slug: toStringValue(row.product_slug),
    variant_id: toStringValue(row.variant_id),
    product_title: toStringValue(row.product_title),
    variant_title: toStringValue(row.variant_title),
    sku: toStringValue(row.sku),
    image: toStringValue(row.image),
    unit_price: unitPrice,
    compare_at_price: toNumberValue(row.compare_at_price),
    quantity,
    line_total: lineTotal,
    created_at: toStringValue(row.created_at),
    updated_at: toStringValue(row.updated_at),
  };
}

function canAccessOrder(
  order: AccountOrderRow,
  params: {
    customerId?: string;
    email?: string;
  }
) {
  const customerId = toStringValue(params.customerId);
  const email = toLowerValue(params.email);

  const rowCustomerId = toStringValue(order.customer_id);
  const rowEmail = toLowerValue(order.email);

  if (customerId && rowCustomerId && rowCustomerId === customerId) {
    return true;
  }

  if (email && rowEmail && rowEmail === email) {
    return true;
  }

  return false;
}

export async function getOrdersForCustomer(params: {
  customerId?: string;
  email?: string;
}) {
  const values = await getSheetValues("orders");

  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map(normalizeHeader);
  const rows = values.slice(1).map((row) => mapRow(headers, row));

  return rows
    .map(parseOrderRow)
    .filter((order) => canAccessOrder(order, params))
    .sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();

      return bTime - aTime;
    });
}

export async function getOrderByOrderNumberForCustomer(params: {
  orderNumber: string;
  customerId?: string;
  email?: string;
}) {
  const normalizedOrderNumber = toLowerValue(params.orderNumber);

  if (!normalizedOrderNumber) {
    return null;
  }

  const orders = await getOrdersForCustomer({
    customerId: params.customerId,
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

  const values = await getSheetValues("order_items");

  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map(normalizeHeader);
  const rows = values.slice(1).map((row) => mapRow(headers, row));

  return rows
    .map(parseOrderItemRow)
    .filter((item) => toStringValue(item.order_id) === normalizedOrderId);
}

export async function getOrderDetailForCustomer(params: {
  orderNumber: string;
  customerId?: string;
  email?: string;
}) {
  const order = await getOrderByOrderNumberForCustomer({
    orderNumber: params.orderNumber,
    customerId: params.customerId,
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