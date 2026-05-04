import {
  appendSheetRow,
  findRowNumberByField,
  findSheetItemByField,
  findSheetItemsByField,
  getSheetData,
  getSheetHeaders,
  updateSheetRowByRowNumber,
} from "./sheets";
import { createId, createOrderNumber, nowIso } from "./ids";
import { toMoney, toNumber } from "./money";

const DRAFT_ORDERS_SHEET = "draft_orders";
const DRAFT_ORDER_ITEMS_SHEET = "draft_order_items";
const ORDERS_SHEET = "orders";
const ORDER_ITEMS_SHEET = "order_items";

export type DraftOrderStatus =
  | "draft"
  | "sent"
  | "approved"
  | "converted"
  | "cancelled";

export type DraftOrderRecord = {
  id: string;
  draft_number: string;
  customer_id: string;
  email: string;
  company: string;
  contact_name: string;
  status: string;
  currency: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  item_count: string;
  note: string;
  created_by: string;
  converted_order_id: string;
  created_at: string;
  updated_at: string;
};

export type DraftOrderItemRecord = {
  id: string;
  draft_order_id: string;
  product_slug: string;
  variant_id: string;
  sku: string;
  product_title: string;
  variant_title: string;
  image: string;
  quantity: string;
  unit_price: string;
  line_total: string;
  created_at: string;
  updated_at: string;
};

export type CreateDraftOrderItemInput = {
  product_slug?: string;
  variant_id?: string;
  sku?: string;
  product_title?: string;
  variant_title?: string;
  image?: string;
  quantity?: string | number;
  unit_price?: string | number;
};

export type CreateDraftOrderInput = {
  customer_id?: string;
  email?: string;
  company?: string;
  contact_name?: string;
  status?: DraftOrderStatus | string;
  currency?: string;
  discount_total?: string | number;
  shipping_total?: string | number;
  tax_total?: string | number;
  note?: string;
  created_by?: string;
  items?: CreateDraftOrderItemInput[];
};

export type UpdateDraftOrderInput = {
  customer_id?: string;
  email?: string;
  company?: string;
  contact_name?: string;
  status?: DraftOrderStatus | string;
  currency?: string;
  discount_total?: string | number;
  shipping_total?: string | number;
  tax_total?: string | number;
  note?: string;
};

export type DraftOrderWithItems = {
  draft: DraftOrderRecord;
  items: DraftOrderItemRecord[];
};

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalize(value).toLowerCase();
}

function normalizeStatus(value: unknown) {
  const status = normalizeLower(value || "draft");

  if (
    status === "draft" ||
    status === "sent" ||
    status === "approved" ||
    status === "converted" ||
    status === "cancelled"
  ) {
    return status;
  }

  return "draft";
}

function createDraftNumber() {
  const date = new Date();
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `DR-${yyyy}${mm}${dd}-${random}`;
}

async function buildRowFromHeaders(
  sheetName: string,
  record: Record<string, unknown>
): Promise<string[]> {
  const headers = await getSheetHeaders(sheetName, {
    forceFresh: true,
    ttlSeconds: 0,
  });

  if (!headers.length) {
    throw new Error(`"${sheetName}" sheet headers could not be found.`);
  }

  return headers.map((header) => {
    const value = record[header];
    return value == null ? "" : String(value);
  });
}

function calculateItems(items: CreateDraftOrderItemInput[]) {
  const normalizedItems = items.map((item) => {
    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unit_price);
    const lineTotal = quantity * unitPrice;

    return {
      product_slug: normalize(item.product_slug),
      variant_id: normalize(item.variant_id),
      sku: normalize(item.sku),
      product_title: normalize(item.product_title),
      variant_title: normalize(item.variant_title),
      image: normalize(item.image),
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => {
    return sum + item.line_total;
  }, 0);

  const itemCount = normalizedItems.reduce((sum, item) => {
    return sum + item.quantity;
  }, 0);

  return {
    items: normalizedItems,
    subtotal,
    itemCount,
  };
}

function calculateGrandTotal(input: {
  subtotal: number;
  discount_total?: string | number;
  shipping_total?: string | number;
  tax_total?: string | number;
}) {
  const discountTotal = toNumber(input.discount_total);
  const shippingTotal = toNumber(input.shipping_total);
  const taxTotal = toNumber(input.tax_total);

  return {
    discountTotal,
    shippingTotal,
    taxTotal,
    grandTotal: input.subtotal - discountTotal + shippingTotal + taxTotal,
  };
}

export async function getAllDraftOrders(): Promise<DraftOrderRecord[]> {
  const rows = (await getSheetData(DRAFT_ORDERS_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  })) as DraftOrderRecord[];

  return [...rows].sort((a, b) => {
    return (
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    );
  });
}

export async function getDraftOrderItems(draftOrderId: string) {
  const normalizedDraftOrderId = normalize(draftOrderId);

  if (!normalizedDraftOrderId) {
    return [];
  }

  return (await findSheetItemsByField(
    DRAFT_ORDER_ITEMS_SHEET,
    "draft_order_id",
    normalizedDraftOrderId,
    { forceFresh: true, ttlSeconds: 0 }
  )) as DraftOrderItemRecord[];
}

export async function getDraftOrderById(
  draftOrderId: string
): Promise<DraftOrderWithItems | null> {
  const normalizedDraftOrderId = normalize(draftOrderId);

  if (!normalizedDraftOrderId) {
    return null;
  }

  const draft = (await findSheetItemByField(
    DRAFT_ORDERS_SHEET,
    "id",
    normalizedDraftOrderId,
    { forceFresh: true, ttlSeconds: 0 }
  )) as DraftOrderRecord | null;

  if (!draft) {
    return null;
  }

  const items = await getDraftOrderItems(draft.id);

  return {
    draft,
    items,
  };
}

export async function getDraftOrderByNumber(
  draftNumber: string
): Promise<DraftOrderWithItems | null> {
  const normalizedDraftNumber = normalize(draftNumber);

  if (!normalizedDraftNumber) {
    return null;
  }

  const draft = (await findSheetItemByField(
    DRAFT_ORDERS_SHEET,
    "draft_number",
    normalizedDraftNumber,
    { forceFresh: true, ttlSeconds: 0 }
  )) as DraftOrderRecord | null;

  if (!draft) {
    return null;
  }

  const items = await getDraftOrderItems(draft.id);

  return {
    draft,
    items,
  };
}

export async function createDraftOrder(input: CreateDraftOrderInput) {
  const now = nowIso();
  const itemsInput = Array.isArray(input.items) ? input.items : [];
  const calculated = calculateItems(itemsInput);
  const totals = calculateGrandTotal({
    subtotal: calculated.subtotal,
    discount_total: input.discount_total,
    shipping_total: input.shipping_total,
    tax_total: input.tax_total,
  });

  const draftRecord: DraftOrderRecord = {
    id: createId("draft"),
    draft_number: createDraftNumber(),
    customer_id: normalize(input.customer_id),
    email: normalizeLower(input.email),
    company: normalize(input.company),
    contact_name: normalize(input.contact_name),
    status: normalizeStatus(input.status),
    currency: normalize(input.currency || "USD") || "USD",
    subtotal: toMoney(calculated.subtotal),
    discount_total: toMoney(totals.discountTotal),
    shipping_total: toMoney(totals.shippingTotal),
    tax_total: toMoney(totals.taxTotal),
    grand_total: toMoney(totals.grandTotal),
    item_count: String(calculated.itemCount),
    note: normalize(input.note),
    created_by: normalize(input.created_by),
    converted_order_id: "",
    created_at: now,
    updated_at: now,
  };

  const draftRow = await buildRowFromHeaders(DRAFT_ORDERS_SHEET, draftRecord);
  await appendSheetRow(DRAFT_ORDERS_SHEET, draftRow);

  const draftItems: DraftOrderItemRecord[] = [];

  for (const item of calculated.items) {
    const itemRecord: DraftOrderItemRecord = {
      id: createId("draftitem"),
      draft_order_id: draftRecord.id,
      product_slug: item.product_slug,
      variant_id: item.variant_id,
      sku: item.sku,
      product_title: item.product_title,
      variant_title: item.variant_title,
      image: item.image,
      quantity: String(item.quantity),
      unit_price: toMoney(item.unit_price),
      line_total: toMoney(item.line_total),
      created_at: now,
      updated_at: now,
    };

    const itemRow = await buildRowFromHeaders(
      DRAFT_ORDER_ITEMS_SHEET,
      itemRecord
    );

    await appendSheetRow(DRAFT_ORDER_ITEMS_SHEET, itemRow);
    draftItems.push(itemRecord);
  }

  return {
    draft: draftRecord,
    items: draftItems,
  };
}

export async function updateDraftOrder(
  draftOrderId: string,
  input: UpdateDraftOrderInput
) {
  const normalizedDraftOrderId = normalize(draftOrderId);

  if (!normalizedDraftOrderId) {
    throw new Error("draftOrderId is required.");
  }

  const current = await getDraftOrderById(normalizedDraftOrderId);

  if (!current) {
    throw new Error("Draft order not found.");
  }

  if (normalizeLower(current.draft.status) === "converted") {
    throw new Error("Converted draft orders cannot be updated.");
  }

  const items = current.items;
  const subtotal = items.reduce((sum, item) => {
    return sum + toNumber(item.line_total);
  }, 0);

  const itemCount = items.reduce((sum, item) => {
    return sum + toNumber(item.quantity);
  }, 0);

  const totals = calculateGrandTotal({
    subtotal,
    discount_total:
      input.discount_total === undefined
        ? current.draft.discount_total
        : input.discount_total,
    shipping_total:
      input.shipping_total === undefined
        ? current.draft.shipping_total
        : input.shipping_total,
    tax_total:
      input.tax_total === undefined ? current.draft.tax_total : input.tax_total,
  });

  const updatedDraft: DraftOrderRecord = {
    ...current.draft,
    customer_id:
      input.customer_id === undefined
        ? current.draft.customer_id
        : normalize(input.customer_id),
    email:
      input.email === undefined
        ? current.draft.email
        : normalizeLower(input.email),
    company:
      input.company === undefined
        ? current.draft.company
        : normalize(input.company),
    contact_name:
      input.contact_name === undefined
        ? current.draft.contact_name
        : normalize(input.contact_name),
    status:
      input.status === undefined
        ? current.draft.status
        : normalizeStatus(input.status),
    currency:
      input.currency === undefined
        ? current.draft.currency
        : normalize(input.currency || "USD") || "USD",
    subtotal: toMoney(subtotal),
    discount_total: toMoney(totals.discountTotal),
    shipping_total: toMoney(totals.shippingTotal),
    tax_total: toMoney(totals.taxTotal),
    grand_total: toMoney(totals.grandTotal),
    item_count: String(itemCount),
    note:
      input.note === undefined ? current.draft.note : normalize(input.note),
    updated_at: nowIso(),
  };

  const rowNumber = await findRowNumberByField(
    DRAFT_ORDERS_SHEET,
    "id",
    normalizedDraftOrderId
  );

  if (!rowNumber) {
    throw new Error("Draft order row could not be found.");
  }

  const row = await buildRowFromHeaders(DRAFT_ORDERS_SHEET, updatedDraft);
  await updateSheetRowByRowNumber(DRAFT_ORDERS_SHEET, rowNumber, row);

  return {
    draft: updatedDraft,
    items,
  };
}

export async function updateDraftOrderStatus(
  draftOrderId: string,
  status: DraftOrderStatus | string
) {
  return updateDraftOrder(draftOrderId, {
    status,
  });
}

export async function convertDraftOrderToOrder(draftOrderId: string) {
  const normalizedDraftOrderId = normalize(draftOrderId);

  if (!normalizedDraftOrderId) {
    throw new Error("draftOrderId is required.");
  }

  const current = await getDraftOrderById(normalizedDraftOrderId);

  if (!current) {
    throw new Error("Draft order not found.");
  }

  if (normalizeLower(current.draft.status) === "converted") {
    throw new Error("Draft order is already converted.");
  }

  if (!current.items.length) {
    throw new Error("Draft order has no items.");
  }

  const now = nowIso();

  const orderRecord = {
    id: createId("order"),
    order_number: createOrderNumber(),
    cart_token: "",
    cart_id: "",
    customer_id: normalize(current.draft.customer_id),
    email: normalizeLower(current.draft.email),
    first_name: "",
    last_name: normalize(current.draft.contact_name),
    company: normalize(current.draft.company),
    phone: "",
    country: "",
    city: "",
    address_line_1: "",
    address_line_2: "",
    postal_code: "",
    note: normalize(current.draft.note),
    status: "submitted",
    currency: normalize(current.draft.currency || "USD") || "USD",
    subtotal: toMoney(current.draft.subtotal),
    discount_total: toMoney(current.draft.discount_total),
    shipping_total: toMoney(current.draft.shipping_total),
    tax_total: toMoney(current.draft.tax_total),
    grand_total: toMoney(current.draft.grand_total),
    item_count: normalize(current.draft.item_count),
    created_at: now,
    updated_at: now,
  };

  const orderRow = await buildRowFromHeaders(ORDERS_SHEET, orderRecord);
  await appendSheetRow(ORDERS_SHEET, orderRow);

  for (const item of current.items) {
    const orderItemRecord = {
      id: createId("orderitem"),
      order_id: orderRecord.id,
      product_slug: normalize(item.product_slug),
      variant_id: normalize(item.variant_id),
      product_title: normalize(item.product_title),
      variant_title: normalize(item.variant_title),
      sku: normalize(item.sku),
      image: normalize(item.image),
      unit_price: toMoney(item.unit_price),
      compare_at_price: "",
      quantity: String(toNumber(item.quantity)),
      line_total: toMoney(item.line_total),
      created_at: now,
      updated_at: now,
    };

    const orderItemRow = await buildRowFromHeaders(
      ORDER_ITEMS_SHEET,
      orderItemRecord
    );

    await appendSheetRow(ORDER_ITEMS_SHEET, orderItemRow);
  }

  const updatedDraft: DraftOrderRecord = {
    ...current.draft,
    status: "converted",
    converted_order_id: orderRecord.id,
    updated_at: nowIso(),
  };

  const rowNumber = await findRowNumberByField(
    DRAFT_ORDERS_SHEET,
    "id",
    current.draft.id
  );

  if (!rowNumber) {
    throw new Error("Draft order row could not be found.");
  }

  const draftRow = await buildRowFromHeaders(DRAFT_ORDERS_SHEET, updatedDraft);
  await updateSheetRowByRowNumber(DRAFT_ORDERS_SHEET, rowNumber, draftRow);

  return {
    order: orderRecord,
    draft: updatedDraft,
    items: current.items,
  };
}