import {
  appendSheetRows,
  getSheetData,
  getSheetHeaders,
  updateSheetRowByRowNumber,
} from "./sheets";

export const SHEET_CONFIG = {
  products: {
    sheetName: "products",
    headers: [
      "id",
      "title",
      "slug",
      "description",
      "short_description",
      "image",
      "gallery",
      "collection_slug",
      "status",
      "featured",
      "seo_title",
      "seo_description",
      "created_at",
      "updated_at",
      "vendor",
      "product_category",
      "type",
      "tags",
    ],
    xmlRoot: "products",
    xmlItem: "product",
  },
  collections: {
    sheetName: "collections",
    headers: [
      "id",
      "title",
      "slug",
      "description",
      "image",
      "status",
      "created_at",
      "updated_at",
    ],
    xmlRoot: "collections",
    xmlItem: "collection",
  },
  blog: {
    sheetName: "blog",
    headers: [
      "id",
      "title",
      "slug",
      "excerpt",
      "content",
      "image",
      "status",
      "featured",
      "created_at",
      "updated_at",
    ],
    xmlRoot: "blogPosts",
    xmlItem: "post",
  },
  customers: {
    sheetName: "customers",
    headers: [
      "id",
      "company_name",
      "contact_name",
      "email",
      "password_hash",
      "status",
      "customer_code",
      "price_tier",
      "currency",
      "shipping_terms",
      "payment_terms",
      "tax_exempt",
      "approved_at",
      "created_at",
      "updated_at",
    ],
    xmlRoot: "customers",
    xmlItem: "customer",
  },
  customer_applications: {
    sheetName: "customer_applications",
    headers: [
      "id",
      "company_name",
      "contact_name",
      "email",
      "phone",
      "country",
      "business_type",
      "tax_id",
      "website",
      "notes",
      "status",
      "created_at",
      "approved_at",
      "reviewed_by",
    ],
    xmlRoot: "customerApplications",
    xmlItem: "application",
  },
    orders: {
    sheetName: "orders",
    headers: [
      "id",
      "order_number",
      "cart_token",
      "cart_id",
      "customer_id",
      "email",
      "first_name",
      "last_name",
      "company",
      "phone",
      "country",
      "city",
      "address_line_1",
      "address_line_2",
      "postal_code",
      "note",
      "status",
      "currency",
      "subtotal",
      "discount_total",
      "shipping_total",
      "tax_total",
      "grand_total",
      "item_count",
      "created_at",
      "updated_at",
    ],
    xmlRoot: "orders",
    xmlItem: "order",
  },
    order_items: {
    sheetName: "order_items",
    headers: [
      "id",
      "order_id",
      "product_slug",
      "variant_id",
      "product_title",
      "variant_title",
      "sku",
      "image",
      "unit_price",
      "compare_at_price",
      "quantity",
      "line_total",
      "created_at",
      "updated_at",
    ],
    xmlRoot: "orderItems",
    xmlItem: "item",
  },
} as const;

export type ContentType = keyof typeof SHEET_CONFIG;

export function makeSlug(text: string) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "row") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function buildRowNumberMapByField(
  items: Record<string, string>[],
  fieldName: string
) {
  const rowMap = new Map<string, number>();

  items.forEach((item, index) => {
    const value = String(item[fieldName] || "").trim().toLowerCase();

    if (value) {
      rowMap.set(value, index + 2);
    }
  });

  return rowMap;
}

function normalizeBooleanString(value: string, fallback = "false") {
  const normalized = String(value || fallback).trim().toLowerCase();
  return normalized === "true" ? "true" : "false";
}

function normalizeStatus(value: string, fallback = "draft") {
  const normalized = String(value || fallback).trim().toLowerCase();

  if (["draft", "published", "archived"].includes(normalized)) {
    return normalized;
  }

  return fallback;
}

export function normalizeRecord(
  type: ContentType,
  input: Record<string, string>,
  existingItem?: Record<string, string>
) {
  const config = SHEET_CONFIG[type];
  const now = nowIso();

  const record: Record<string, string> = {};

  config.headers.forEach((header) => {
    record[header] = String(input[header] ?? existingItem?.[header] ?? "").trim();
  });

  if (!record.id) {
    record.id =
      existingItem?.id ||
      makeId(
        type === "products"
          ? "prd"
          : type === "collections"
          ? "col"
          : type === "blog"
          ? "blog"
          : type === "customers"
          ? "cust"
          : type === "customer_applications"
          ? "app"
          : type === "orders"
          ? "ord"
          : "row"
      );
  }

  if ("slug" in record && !record.slug && record.title) {
    record.slug = makeSlug(record.title);
  }

  if (type === "products" || type === "blog") {
    record.featured = normalizeBooleanString(
      record.featured || existingItem?.featured || "false"
    );
  }

  if (type === "products") {
    if (!record.status) {
      record.status = existingItem?.status || "draft";
    }

    record.status = normalizeStatus(record.status);

    if (!record.seo_title) {
      record.seo_title = existingItem?.seo_title || record.title || "";
    }

    if (!record.seo_description) {
      record.seo_description =
        existingItem?.seo_description ||
        record.short_description ||
        record.description ||
        "";
    }
  }

  if ("created_at" in record && !record.created_at) {
    record.created_at = existingItem?.created_at || now;
  }

  if ("updated_at" in record) {
    record.updated_at = now;
  }

  return record;
}

export function objectToOrderedRow(
  headers: readonly string[],
  item: Record<string, string>
) {
  return headers.map((header) => String(item[header] ?? ""));
}

export async function getExportData(type: ContentType) {
  const config = SHEET_CONFIG[type];
  const items = await getSheetData(config.sheetName, { forceFresh: true });

  return {
    ...config,
    items,
  };
}

export async function importRecords(
  type: ContentType,
  incomingItems: Record<string, string>[]
) {
  const config = SHEET_CONFIG[type];
  const sheetName = config.sheetName;

  if (!["products", "collections", "blog"].includes(type)) {
    throw new Error(`Import is not enabled for "${type}".`);
  }

  const existingItems = (await getSheetData(sheetName, {
    forceFresh: true,
  })) as Record<string, string>[];

  const rowMap = buildRowNumberMapByField(existingItems, "slug");

  const existingBySlug = new Map<string, Record<string, string>>();

  for (const item of existingItems) {
    const slug = String(item.slug || "").trim().toLowerCase();

    if (slug) {
      existingBySlug.set(slug, item);
    }
  }

  const rowsToAppend: string[][] = [];
  const rowsToUpdate: Array<{ rowNumber: number; rowValues: string[] }> = [];
  const errors: string[] = [];

  for (let index = 0; index < incomingItems.length; index += 1) {
    const rawItem = incomingItems[index];

    try {
      const preparedSlug =
        rawItem.slug?.trim() || makeSlug(String(rawItem.title || ""));

      if (!preparedSlug) {
        throw new Error("slug or title is required.");
      }

      rawItem.slug = preparedSlug;

      const existingItem = existingBySlug.get(preparedSlug.toLowerCase());
      const normalized = normalizeRecord(type, rawItem, existingItem);
      const rowValues = objectToOrderedRow(config.headers, normalized);

      if (existingItem) {
        const rowNumber = rowMap.get(preparedSlug.toLowerCase());

        if (!rowNumber) {
          throw new Error(`Row number was not found for slug "${preparedSlug}".`);
        }

        rowsToUpdate.push({
          rowNumber,
          rowValues,
        });
      } else {
        rowsToAppend.push(rowValues);
      }
    } catch (error) {
      errors.push(
        `Row ${index + 2}: ${
          error instanceof Error ? error.message : "Unknown import error."
        }`
      );
    }
  }

  for (const item of rowsToUpdate) {
    await updateSheetRowByRowNumber(sheetName, item.rowNumber, item.rowValues);
  }

  if (rowsToAppend.length) {
    await appendSheetRows(sheetName, rowsToAppend);
  }

  return {
    ok: true,
    inserted: rowsToAppend.length,
    updated: rowsToUpdate.length,
    errors,
  };
}

export async function validateSheetHeaders(type: ContentType) {
  const config = SHEET_CONFIG[type];

  const actualHeaders = await getSheetHeaders(config.sheetName, {
    forceFresh: true,
  });

  const expected = [...config.headers].join("|");
  const actual = actualHeaders.join("|");

  if (expected !== actual) {
    throw new Error(
      `Sheet headers mismatch for "${config.sheetName}". Expected: ${config.headers.join(
        ", "
      )}`
    );
  }

  return true;
}