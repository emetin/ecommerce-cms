import { google } from "googleapis";
import type {
  Cart,
  CartItem,
  Customer,
  Order,
  OrderItem,
  CartStatus,
} from "./types";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const SHEET_NAMES = {
  customers: "customers",
  carts: "carts",
  cartItems: "cart_items",
  orders: "orders",
  orderItems: "order_items",
} as const;

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
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
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

function toNumber(value: unknown): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function toStringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function toBoolLikeString(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function mapRow<T extends Record<string, unknown>>(
  headers: string[],
  row: unknown[]
): T {
  const obj: Record<string, unknown> = {};
  headers.forEach((header, i) => {
    obj[header] = row[i] ?? "";
  });
  return obj as T;
}

async function getSheetValues(sheetName: string): Promise<string[][]> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID!,
    range: `${sheetName}!A:ZZ`,
  });

  return (res.data.values ?? []) as string[][];
}

async function appendRows(sheetName: string, rows: (string | number)[][]) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID!,
    range: `${sheetName}!A:ZZ`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows,
    },
  });
}

async function updateSingleCellById(
  sheetName: string,
  id: string,
  columnName: string,
  value: string | number
) {
  const allValues = await getSheetValues(sheetName);
  if (allValues.length === 0) {
    throw new Error(`Sheet "${sheetName}" is empty.`);
  }

  const headers = allValues[0].map(normalizeHeader);
  const idCol = headers.indexOf("id");
  const targetCol = headers.indexOf(normalizeHeader(columnName));

  if (idCol === -1) {
    throw new Error(`Sheet "${sheetName}" does not contain "id" column.`);
  }

  if (targetCol === -1) {
    throw new Error(`Sheet "${sheetName}" does not contain "${columnName}" column.`);
  }

  const rowIndex = allValues.findIndex(
    (row, index) => index > 0 && String(row[idCol] ?? "").trim() === id
  );

  if (rowIndex === -1) {
    throw new Error(`Row with id "${id}" not found in "${sheetName}".`);
  }

  const a1 = `${sheetName}!${columnNumberToName(targetCol + 1)}${rowIndex + 1}`;
  const sheets = await getSheets();

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID!,
    range: a1,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[value]],
    },
  });
}

function columnNumberToName(column: number): string {
  let temp = "";
  let letter = "";
  let col = column;

  while (col > 0) {
    temp = ((col - 1) % 26) + 1 + 64 + "";
    letter = String.fromCharCode(Number(temp)) + letter;
    col = (col - ((col - 1) % 26) - 1) / 26;
  }

  return letter;
}

function buildRowFromHeaders<T extends Record<string, unknown>>(
  headers: string[],
  data: T
): (string | number)[] {
  return headers.map((header) => {
    const value = data[header];
    if (value === undefined || value === null) return "";
    if (typeof value === "number") return value;
    return String(value);
  });
}

export async function getHeaders(sheetName: string): Promise<string[]> {
  const values = await getSheetValues(sheetName);
  if (!values.length) {
    throw new Error(`Sheet "${sheetName}" has no header row.`);
  }
  return values[0].map(normalizeHeader);
}

export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const values = await getSheetValues(SHEET_NAMES.customers);
  if (values.length < 2) return null;

  const headers = values[0].map(normalizeHeader);
  const rows = values
    .slice(1)
    .map((row) => mapRow<Record<string, unknown>>(headers, row));

  const found = rows.find((row) => toStringValue(row.id) === customerId);
  if (!found) return null;

  return {
    id: toStringValue(found.id),
    email: toStringValue(found.email),
    password_hash: toStringValue(found.password_hash),
    first_name: toStringValue(found.first_name),
    last_name: toStringValue(found.last_name),
    company: toStringValue(found.company),
    phone: toStringValue(found.phone),
    country: toStringValue(found.country),
    city: toStringValue(found.city),
    address_line_1: toStringValue(found.address_line_1),
    address_line_2: toStringValue(found.address_line_2),
    postal_code: toStringValue(found.postal_code),
    status: toStringValue(found.status),
    created_at: toStringValue(found.created_at),
    updated_at: toStringValue(found.updated_at),
    last_login_at: toStringValue(found.last_login_at),
    tax_exempt: toBoolLikeString(found.tax_exempt),
    approved_at: toStringValue(found.approved_at),
    must_change_password: toBoolLikeString(found.must_change_password),
    price_tier: toStringValue(found.price_tier),
    currency: toStringValue(found.currency),
    customer_code: toStringValue(found.customer_code),
    reset_token: toStringValue(found.reset_token),
    reset_token_expires_at: toStringValue(found.reset_token_expires_at),
    reset_requested_at: toStringValue(found.reset_requested_at),
  };
}

export async function getCartByToken(cartToken: string): Promise<Cart | null> {
  const values = await getSheetValues(SHEET_NAMES.carts);
  if (values.length < 2) return null;

  const headers = values[0].map(normalizeHeader);
  const rows = values
    .slice(1)
    .map((row) => mapRow<Record<string, unknown>>(headers, row));

  const found = rows.find((row) => toStringValue(row.cart_token) === cartToken);
  if (!found) return null;

  return {
    id: toStringValue(found.id),
    cart_token: toStringValue(found.cart_token),
    customer_id: toStringValue(found.customer_id),
    status: (toStringValue(found.status) || "active") as CartStatus,
    currency: toStringValue(found.currency) || "USD",
    subtotal: toNumber(found.subtotal),
    discount_total: toNumber(found.discount_total),
    shipping_total: toNumber(found.shipping_total),
    tax_total: toNumber(found.tax_total),
    grand_total: toNumber(found.grand_total),
    item_count: toNumber(found.item_count),
    note: toStringValue(found.note),
    created_at: toStringValue(found.created_at),
    updated_at: toStringValue(found.updated_at),
    expires_at: toStringValue(found.expires_at),
  };
}

export async function getCartById(cartId: string): Promise<Cart | null> {
  const values = await getSheetValues(SHEET_NAMES.carts);
  if (values.length < 2) return null;

  const headers = values[0].map(normalizeHeader);
  const rows = values
    .slice(1)
    .map((row) => mapRow<Record<string, unknown>>(headers, row));

  const found = rows.find((row) => toStringValue(row.id) === cartId);
  if (!found) return null;

  return {
    id: toStringValue(found.id),
    cart_token: toStringValue(found.cart_token),
    customer_id: toStringValue(found.customer_id),
    status: (toStringValue(found.status) || "active") as CartStatus,
    currency: toStringValue(found.currency) || "USD",
    subtotal: toNumber(found.subtotal),
    discount_total: toNumber(found.discount_total),
    shipping_total: toNumber(found.shipping_total),
    tax_total: toNumber(found.tax_total),
    grand_total: toNumber(found.grand_total),
    item_count: toNumber(found.item_count),
    note: toStringValue(found.note),
    created_at: toStringValue(found.created_at),
    updated_at: toStringValue(found.updated_at),
    expires_at: toStringValue(found.expires_at),
  };
}

export async function getCartItems(cartId: string): Promise<CartItem[]> {
  const values = await getSheetValues(SHEET_NAMES.cartItems);
  if (values.length < 2) return [];

  const headers = values[0].map(normalizeHeader);
  const rows = values
    .slice(1)
    .map((row) => mapRow<Record<string, unknown>>(headers, row));

  return rows
    .filter((row) => toStringValue(row.cart_id) === cartId)
    .map((row) => ({
      id: toStringValue(row.id),
      cart_id: toStringValue(row.cart_id),
      product_slug: toStringValue(row.product_slug),
      variant_id: toStringValue(row.variant_id),
      product_title: toStringValue(row.product_title),
      variant_title: toStringValue(row.variant_title),
      sku: toStringValue(row.sku),
      image: toStringValue(row.image),
      unit_price: toNumber(row.unit_price),
      compare_at_price: toNumber(row.compare_at_price),
      quantity: toNumber(row.quantity),
      line_total: toNumber(row.line_total),
      created_at: toStringValue(row.created_at),
      updated_at: toStringValue(row.updated_at),
    }));
}

export async function getOrderByCartId(cartId: string): Promise<Order | null> {
  const values = await getSheetValues(SHEET_NAMES.orders);
  if (values.length < 2) return null;

  const headers = values[0].map(normalizeHeader);
  const rows = values
    .slice(1)
    .map((row) => mapRow<Record<string, unknown>>(headers, row));

  const found = rows.find((row) => toStringValue(row.cart_id) === cartId);
  if (!found) return null;

  return {
    id: toStringValue(found.id),
    order_number: toStringValue(found.order_number),
    cart_token: toStringValue(found.cart_token),
    cart_id: toStringValue(found.cart_id),
    customer_id: toStringValue(found.customer_id),
    email: toStringValue(found.email),
    first_name: toStringValue(found.first_name),
    last_name: toStringValue(found.last_name),
    company: toStringValue(found.company),
    phone: toStringValue(found.phone),
    country: toStringValue(found.country),
    city: toStringValue(found.city),
    address_line_1: toStringValue(found.address_line_1),
    address_line_2: toStringValue(found.address_line_2),
    postal_code: toStringValue(found.postal_code),
    note: toStringValue(found.note),
    status: (toStringValue(found.status) || "pending") as Order["status"],
    currency: toStringValue(found.currency) || "USD",
    subtotal: toNumber(found.subtotal),
    discount_total: toNumber(found.discount_total),
    shipping_total: toNumber(found.shipping_total),
    tax_total: toNumber(found.tax_total),
    grand_total: toNumber(found.grand_total),
    item_count: toNumber(found.item_count),
    created_at: toStringValue(found.created_at),
    updated_at: toStringValue(found.updated_at),
  };
}

export async function appendOrder(order: Order): Promise<void> {
  const headers = await getHeaders(SHEET_NAMES.orders);
  const row = buildRowFromHeaders(headers, order as unknown as Record<string, unknown>);
  await appendRows(SHEET_NAMES.orders, [row]);
}

export async function appendOrderItems(items: OrderItem[]): Promise<void> {
  if (!items.length) return;

  const headers = await getHeaders(SHEET_NAMES.orderItems);
  const rows = items.map((item) =>
    buildRowFromHeaders(headers, item as unknown as Record<string, unknown>)
  );

  await appendRows(SHEET_NAMES.orderItems, rows);
}

export async function updateCartStatus(cartId: string, status: CartStatus): Promise<void> {
  await updateSingleCellById(SHEET_NAMES.carts, cartId, "status", status);
  await updateSingleCellById(
    SHEET_NAMES.carts,
    cartId,
    "updated_at",
    new Date().toISOString()
  );
}