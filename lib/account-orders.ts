import { google } from "googleapis";

type OrderRow = {
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

type OrderItemRow = {
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
  return google.sheets({ version: "v4", auth });
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function toStringValue(value: unknown): string {
  return String(value ?? "").trim();
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

function parseOrderRow(row: Record<string, unknown>): OrderRow {
  return {
    id: toStringValue(row.id),
    order_number: toStringValue(row.order_number),
    cart_token: toStringValue(row.cart_token),
    cart_id: toStringValue(row.cart_id),
    customer_id: toStringValue(row.customer_id),
    email: toStringValue(row.email),
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
    status: toStringValue(row.status),
    currency: toStringValue(row.currency) || "USD",
    subtotal: toNumberValue(row.subtotal),
    discount_total: toNumberValue(row.discount_total),
    shipping_total: toNumberValue(row.shipping_total),
    tax_total: toNumberValue(row.tax_total),
    grand_total: toNumberValue(row.grand_total),
    item_count: toNumberValue(row.item_count),
    created_at: toStringValue(row.created_at),
    updated_at: toStringValue(row.updated_at),
  };
}

function parseOrderItemRow(row: Record<string, unknown>): OrderItemRow {
  return {
    id: toStringValue(row.id),
    order_id: toStringValue(row.order_id),
    product_slug: toStringValue(row.product_slug),
    variant_id: toStringValue(row.variant_id),
    product_title: toStringValue(row.product_title),
    variant_title: toStringValue(row.variant_title),
    sku: toStringValue(row.sku),
    image: toStringValue(row.image),
    unit_price: toNumberValue(row.unit_price),
    compare_at_price: toNumberValue(row.compare_at_price),
    quantity: toNumberValue(row.quantity),
    line_total: toNumberValue(row.line_total),
    created_at: toStringValue(row.created_at),
    updated_at: toStringValue(row.updated_at),
  };
}

export async function getOrdersForCustomer(params: {
  customerId?: string;
  email?: string;
}) {
  const values = await getSheetValues("orders");
  if (values.length < 2) return [];

  const headers = values[0].map(normalizeHeader);
  const rows = values.slice(1).map((row) => mapRow(headers, row));

  const customerId = toStringValue(params.customerId);
  const email = toStringValue(params.email).toLowerCase();

  const filtered = rows.filter((row) => {
    const rowCustomerId = toStringValue(row.customer_id);
    const rowEmail = toStringValue(row.email).toLowerCase();

    if (customerId && rowCustomerId === customerId) return true;
    if (email && rowEmail === email) return true;

    return false;
  });

  return filtered
    .map(parseOrderRow)
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
  const orders = await getOrdersForCustomer({
    customerId: params.customerId,
    email: params.email,
  });

  return (
    orders.find(
      (order) =>
        order.order_number.toLowerCase() === params.orderNumber.toLowerCase()
    ) || null
  );
}

export async function getOrderItemsByOrderId(orderId: string) {
  const values = await getSheetValues("order_items");
  if (values.length < 2) return [];

  const headers = values[0].map(normalizeHeader);
  const rows = values.slice(1).map((row) => mapRow(headers, row));

  return rows
    .filter((row) => toStringValue(row.order_id) === orderId)
    .map(parseOrderItemRow);
}