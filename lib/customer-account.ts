import bcrypt from "bcryptjs";
import {
  appendSheetRow,
  findRowNumberByField,
  findSheetItemByField,
  getSheetData,
  getSheetHeaders,
  updateSheetRowByRowNumber,
} from "./sheets";
import { createId, nowIso } from "./ids";

type CustomerRow = Record<string, string>;
type OrderRow = Record<string, string>;
type OrderItemRow = Record<string, string>;

const CUSTOMERS_SHEET = "customers";
const ORDERS_SHEET = "orders";
const ORDER_ITEMS_SHEET = "order_items";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function mapHeadersToRow(headers: string[], record: Record<string, string>) {
  return headers.map((header) => normalizeText(record[header]));
}

export function sanitizeCustomer(customer: CustomerRow) {
  return {
    id: normalizeText(customer.id),
    email: normalizeLower(customer.email),
    first_name: normalizeText(customer.first_name),
    last_name: normalizeText(customer.last_name),
    company: normalizeText(customer.company),
    phone: normalizeText(customer.phone),
    country: normalizeText(customer.country),
    city: normalizeText(customer.city),
    address_line_1: normalizeText(customer.address_line_1),
    address_line_2: normalizeText(customer.address_line_2),
    postal_code: normalizeText(customer.postal_code),
    status: normalizeText(customer.status),
    created_at: normalizeText(customer.created_at),
    updated_at: normalizeText(customer.updated_at),
    last_login_at: normalizeText(customer.last_login_at),
    tax_exempt: normalizeText(customer.tax_exempt),
    approved_at: normalizeText(customer.approved_at),
  };
}

export async function findCustomerByEmail(email: string) {
  const normalizedEmail = normalizeLower(email);

  if (!normalizedEmail) {
    return null;
  }

  return findSheetItemByField<CustomerRow>(
    CUSTOMERS_SHEET,
    "email",
    normalizedEmail,
    { ttlSeconds: 60 }
  );
}

export async function findCustomerById(id: string) {
  const normalizedId = normalizeText(id);

  if (!normalizedId) {
    return null;
  }

  return findSheetItemByField<CustomerRow>(CUSTOMERS_SHEET, "id", normalizedId, {
    ttlSeconds: 60,
  });
}

export async function createCustomerAccount(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company?: string;
  phone?: string;
  country?: string;
  city?: string;
  address_line_1?: string;
  address_line_2?: string;
  postal_code?: string;
}) {
  const email = normalizeLower(input.email);
  const firstName = normalizeText(input.first_name);
  const lastName = normalizeText(input.last_name);
  const company = normalizeText(input.company);
  const phone = normalizeText(input.phone);
  const country = normalizeText(input.country);
  const city = normalizeText(input.city);
  const addressLine1 = normalizeText(input.address_line_1);
  const addressLine2 = normalizeText(input.address_line_2);
  const postalCode = normalizeText(input.postal_code);
  const password = normalizeText(input.password);

  if (!email || !password || !firstName || !lastName) {
    throw new Error("Ad, soyad, e-posta ve şifre zorunludur.");
  }

  if (password.length < 8) {
    throw new Error("Şifre en az 8 karakter olmalıdır.");
  }

  const existing = await findCustomerByEmail(email);

  if (existing) {
    throw new Error("Bu e-posta adresi ile kayıtlı bir hesap zaten var.");
  }

  const headers = await getSheetHeaders(CUSTOMERS_SHEET, { forceFresh: true });
  const timestamp = nowIso();
  const passwordHash = await bcrypt.hash(password, 10);

  const record: Record<string, string> = {
    id: createId("cus"),
    email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    company,
    phone,
    country,
    city,
    address_line_1: addressLine1,
    address_line_2: addressLine2,
    postal_code: postalCode,
    status: "active",
    created_at: timestamp,
    updated_at: timestamp,
    last_login_at: timestamp,
    tax_exempt: "false",
    approved_at: timestamp,
  };

  const row = mapHeadersToRow(headers, record);
  await appendSheetRow(CUSTOMERS_SHEET, row);

  return record;
}

export async function touchCustomerLogin(customerId: string) {
  const customer = await findCustomerById(customerId);

  if (!customer) {
    return null;
  }

  const rowNumber = await findRowNumberByField(CUSTOMERS_SHEET, "id", customerId);

  if (!rowNumber) {
    return null;
  }

  const headers = await getSheetHeaders(CUSTOMERS_SHEET, { forceFresh: true });
  const updated = {
    ...customer,
    updated_at: nowIso(),
    last_login_at: nowIso(),
  };

  const row = mapHeadersToRow(headers, updated);
  await updateSheetRowByRowNumber(CUSTOMERS_SHEET, rowNumber, row);

  return updated;
}

export async function updateCustomerProfile(
  customerId: string,
  updates: {
    first_name?: string;
    last_name?: string;
    company?: string;
    phone?: string;
    country?: string;
    city?: string;
    address_line_1?: string;
    address_line_2?: string;
    postal_code?: string;
  }
) {
  const customer = await findCustomerById(customerId);

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const rowNumber = await findRowNumberByField(CUSTOMERS_SHEET, "id", customerId);

  if (!rowNumber) {
    throw new Error("Customer row not found.");
  }

  const headers = await getSheetHeaders(CUSTOMERS_SHEET, { forceFresh: true });

  const nextRecord: Record<string, string> = {
    ...customer,
    first_name:
      updates.first_name !== undefined
        ? normalizeText(updates.first_name)
        : normalizeText(customer.first_name),
    last_name:
      updates.last_name !== undefined
        ? normalizeText(updates.last_name)
        : normalizeText(customer.last_name),
    company:
      updates.company !== undefined
        ? normalizeText(updates.company)
        : normalizeText(customer.company),
    phone:
      updates.phone !== undefined
        ? normalizeText(updates.phone)
        : normalizeText(customer.phone),
    country:
      updates.country !== undefined
        ? normalizeText(updates.country)
        : normalizeText(customer.country),
    city:
      updates.city !== undefined
        ? normalizeText(updates.city)
        : normalizeText(customer.city),
    address_line_1:
      updates.address_line_1 !== undefined
        ? normalizeText(updates.address_line_1)
        : normalizeText(customer.address_line_1),
    address_line_2:
      updates.address_line_2 !== undefined
        ? normalizeText(updates.address_line_2)
        : normalizeText(customer.address_line_2),
    postal_code:
      updates.postal_code !== undefined
        ? normalizeText(updates.postal_code)
        : normalizeText(customer.postal_code),
    updated_at: nowIso(),
  };

  const row = mapHeadersToRow(headers, nextRecord);
  await updateSheetRowByRowNumber(CUSTOMERS_SHEET, rowNumber, row);

  return nextRecord;
}

export async function getOrdersForCustomer(params: {
  customerId: string;
  email: string;
}) {
  const customerId = normalizeText(params.customerId);
  const email = normalizeLower(params.email);

  const orders = (await getSheetData(ORDERS_SHEET, {
    ttlSeconds: 30,
  })) as OrderRow[];

  const orderItems = (await getSheetData(ORDER_ITEMS_SHEET, {
    ttlSeconds: 30,
  })) as OrderItemRow[];

  const matchedOrders = orders
    .filter((order) => {
      const orderCustomerId = normalizeText(order.customer_id);
      const orderEmail = normalizeLower(order.email);

      if (orderCustomerId && orderCustomerId === customerId) {
        return true;
      }

      if (!orderCustomerId && email && orderEmail === email) {
        return true;
      }

      return false;
    })
    .sort((a, b) =>
      normalizeText(b.created_at).localeCompare(normalizeText(a.created_at))
    );

  return matchedOrders.map((order) => {
    const orderId = normalizeText(order.id);

    return {
      id: orderId,
      order_number: normalizeText(order.order_number),
      cart_token: normalizeText(order.cart_token),
      cart_id: normalizeText(order.cart_id),
      customer_id: normalizeText(order.customer_id),
      email: normalizeLower(order.email),
      first_name: normalizeText(order.first_name),
      last_name: normalizeText(order.last_name),
      company: normalizeText(order.company),
      phone: normalizeText(order.phone),
      country: normalizeText(order.country),
      city: normalizeText(order.city),
      address_line_1: normalizeText(order.address_line_1),
      address_line_2: normalizeText(order.address_line_2),
      postal_code: normalizeText(order.postal_code),
      note: normalizeText(order.note),
      status: normalizeText(order.status),
      currency: normalizeText(order.currency || "USD"),
      subtotal: normalizeText(order.subtotal),
      discount_total: normalizeText(order.discount_total),
      shipping_total: normalizeText(order.shipping_total),
      tax_total: normalizeText(order.tax_total),
      grand_total: normalizeText(order.grand_total),
      item_count: normalizeText(order.item_count),
      created_at: normalizeText(order.created_at),
      updated_at: normalizeText(order.updated_at),
      items: orderItems
        .filter((item) => normalizeText(item.order_id) === orderId)
        .map((item) => ({
          id: normalizeText(item.id),
          order_id: normalizeText(item.order_id),
          product_slug: normalizeText(item.product_slug),
          variant_id: normalizeText(item.variant_id),
          product_title: normalizeText(item.product_title),
          variant_title: normalizeText(item.variant_title),
          sku: normalizeText(item.sku),
          image: normalizeText(item.image),
          unit_price: normalizeText(item.unit_price),
          compare_at_price: normalizeText(item.compare_at_price),
          quantity: normalizeText(item.quantity),
          line_total: normalizeText(item.line_total),
          created_at: normalizeText(item.created_at),
          updated_at: normalizeText(item.updated_at),
        })),
    };
  });
}