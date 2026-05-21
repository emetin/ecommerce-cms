import { NextRequest, NextResponse } from "next/server";
import { parseCsvImportText } from "../../../../lib/import/csv-import";
import { parseJsonImportText } from "../../../../lib/import/json-import";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

type IncomingProduct = Record<string, unknown>;

const ALLOWED_STATUS = ["published", "draft", "archived"];

function makeSlug(text: string) {
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

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeLower(value);

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizeStatus(value: unknown) {
  const status = normalizeLower(value || "draft");

  if (ALLOWED_STATUS.includes(status)) {
    return status;
  }

  return "draft";
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function toIntegerOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.floor(number);
}

function toPositiveInteger(value: unknown, fallback: number) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  const floored = Math.floor(number);

  return floored > 0 ? floored : fallback;
}

function splitGallery(value: unknown) {
  return normalizeText(value)
    .split(/[\n,|]+/g)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

async function getCollectionIdBySlug(collectionSlug: string) {
  if (!collectionSlug) {
    return "";
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("collections")
    .select("id, slug")
    .eq("slug", collectionSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeText(data?.id);
}

async function syncProductCollection(params: {
  productId: string;
  collectionId: string;
}) {
  if (!params.productId || !params.collectionId) {
    return;
  }

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("product_collections").upsert(
    {
      product_id: params.productId,
      collection_id: params.collectionId,
      sort_order: 0,
    },
    {
      onConflict: "product_id,collection_id",
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function syncProductImages(params: {
  productId: string;
  title: string;
  imageUrl: string;
  imageFileId: string;
  imageAlt: string;
  gallery: string;
}) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const galleryImages = splitGallery(params.gallery);
  const rows: Array<Record<string, unknown>> = [];

  if (params.imageUrl) {
    rows.push({
      product_id: params.productId,
      image_url: params.imageUrl,
      image_file_id: params.imageFileId || null,
      alt_text: params.imageAlt || params.title,
      sort_order: 0,
      is_main: true,
      created_at: now,
      updated_at: now,
    });
  }

  galleryImages.forEach((galleryImage, index) => {
    if (!galleryImage || galleryImage === params.imageUrl) {
      return;
    }

    rows.push({
      product_id: params.productId,
      image_url: galleryImage,
      image_file_id: null,
      alt_text: params.imageAlt || params.title,
      sort_order: index + 1,
      is_main: !params.imageUrl && index === 0,
      created_at: now,
      updated_at: now,
    });
  });

  if (!rows.length) {
    return;
  }

  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", params.productId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { error: insertError } = await supabase
    .from("product_images")
    .insert(rows);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function createOrUpdateDefaultVariant(params: {
  productId: string;
  title: string;
  sku: string;
  barcode: string;
  basePrice: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  inventoryQuantity: number | null;
  inventoryPolicy: string;
  inventoryTracker: string;
  taxable: boolean;
  requiresShipping: boolean;
  weight: number | null;
  weightUnit: string;
  imageUrl: string;
  imageFileId: string;
  boxQuantity: number;
  minOrderQuantity: number;
  quantityStep: number;
}) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: existingVariant, error: existingError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", params.productId)
    .ilike("title", "Default Title")
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const payload = {
    product_id: params.productId,
    title: "Default Title",
    sku: params.sku || null,
    barcode: params.barcode || null,
    option1_name: null,
    option1_value: null,
    option2_name: null,
    option2_value: null,
    option3_name: null,
    option3_value: null,
    price: params.basePrice,
    compare_at_price: params.compareAtPrice,
    cost_price: params.costPrice,
    inventory_quantity: params.inventoryQuantity,
    inventory_policy: params.inventoryPolicy || null,
    inventory_tracker: params.inventoryTracker || null,
    fulfillment_service: "manual",
    requires_shipping: params.requiresShipping,
    taxable: params.taxable,
    variant_image_url: params.imageUrl || null,
    variant_image_file_id: params.imageFileId || null,
    weight: params.weight,
    weight_unit: params.weightUnit || null,
    box_quantity: params.boxQuantity,
    min_order_quantity: params.minOrderQuantity,
    quantity_step: params.quantityStep,
    status: "active",
    sort_order: 0,
    updated_at: now,
  };

  if (existingVariant?.id) {
    const { error } = await supabase
      .from("product_variants")
      .update(payload)
      .eq("id", existingVariant.id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.from("product_variants").insert({
    ...payload,
    created_at: now,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function prepareProductPayload(rawItem: IncomingProduct, existingItem?: any) {
  const now = new Date().toISOString();

  const title = normalizeText(rawItem.title || existingItem?.title);
  const slug = makeSlug(normalizeText(rawItem.slug) || title);
  const handle = makeSlug(normalizeText(rawItem.handle) || slug);

  const description = normalizeText(rawItem.description);
  const shortDescription = normalizeText(rawItem.short_description);

  const imageUrl = normalizeText(rawItem.image_url || rawItem.image);
  const imageFileId = normalizeText(rawItem.image_file_id);
  const imageAlt = normalizeText(rawItem.image_alt || title);

  const status = normalizeStatus(rawItem.status);
  const featured = normalizeBoolean(rawItem.featured, false);

  const seoTitle = normalizeText(rawItem.seo_title || title);
  const seoDescription = normalizeText(
    rawItem.seo_description || shortDescription || description
  );

  const productType = normalizeText(rawItem.product_type || rawItem.type);

  const boxQuantity = toPositiveInteger(rawItem.box_quantity, 1);
  const minOrderQuantity = toPositiveInteger(
    rawItem.min_order_quantity,
    boxQuantity
  );
  const quantityStep = toPositiveInteger(rawItem.quantity_step, boxQuantity);

  const inventoryQuantity = toIntegerOrNull(rawItem.inventory_quantity);
  const inventoryPolicy = normalizeText(rawItem.inventory_policy || "deny");
  const inventoryTracker = normalizeText(rawItem.inventory_tracker);

  const taxable = normalizeBoolean(rawItem.taxable, true);
  const requiresShipping = normalizeBoolean(rawItem.requires_shipping, true);

  const isWholesaleOnly = normalizeBoolean(rawItem.is_wholesale_only, true);
  const allowQuoteRequest = normalizeBoolean(rawItem.allow_quote_request, true);
  const allowOnlineCheckout = normalizeBoolean(
    rawItem.allow_online_checkout,
    false
  );

  return {
    title,
    slug,
    handle,
    description,
    shortDescription,
    imageUrl,
    imageFileId,
    imageAlt,
    status,
    featured,
    seoTitle,
    seoDescription,
    vendor: normalizeText(rawItem.vendor),
    productCategory: normalizeText(rawItem.product_category),
    productType,
    tags: normalizeText(rawItem.tags),

    sku: normalizeText(rawItem.sku),
    barcode: normalizeText(rawItem.barcode),
    basePrice: toNumberOrNull(rawItem.base_price),
    compareAtPrice: toNumberOrNull(rawItem.compare_at_price),
    costPrice: toNumberOrNull(rawItem.cost_price),
    currency: normalizeText(rawItem.currency || "USD") || "USD",
    boxQuantity,
    minOrderQuantity,
    quantityStep,
    inventoryQuantity,
    inventoryPolicy,
    inventoryTracker,
    taxable,
    requiresShipping,
    weight: toNumberOrNull(rawItem.weight),
    weightUnit: normalizeText(rawItem.weight_unit || "lb"),
    isWholesaleOnly,
    allowQuoteRequest,
    allowOnlineCheckout,

    collectionSlug: normalizeLower(rawItem.collection_slug),
    gallery: normalizeText(rawItem.gallery),
    now,
  };
}

async function importProduct(rawItem: IncomingProduct) {
  const supabase = createSupabaseAdminClient();

  const preparedSlug = makeSlug(
    normalizeText(rawItem.slug) || normalizeText(rawItem.title)
  );

  if (!preparedSlug) {
    throw new Error("slug or title is required.");
  }

  const { data: existingItem, error: existingError } = await supabase
    .from("products")
    .select("id, title, slug, created_at")
    .eq("slug", preparedSlug)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const prepared = prepareProductPayload(rawItem, existingItem);

  if (!prepared.title) {
    throw new Error("title is required.");
  }

  const primaryCollectionId = await getCollectionIdBySlug(
    prepared.collectionSlug
  );

  const productPayload = {
    title: prepared.title,
    slug: prepared.slug,
    handle: prepared.handle,
    description: prepared.description || null,
    short_description: prepared.shortDescription || null,
    image_url: prepared.imageUrl || null,
    image_file_id: prepared.imageFileId || null,
    image_alt: prepared.imageAlt || null,
    primary_collection_id: primaryCollectionId || null,
    status: prepared.status,
    featured: prepared.featured,
    seo_title: prepared.seoTitle || null,
    seo_description: prepared.seoDescription || null,
    vendor: prepared.vendor || null,
    product_category: prepared.productCategory || null,
    product_type: prepared.productType || null,
    tags: prepared.tags || null,
    sku: prepared.sku || null,
    barcode: prepared.barcode || null,
    base_price: prepared.basePrice,
    compare_at_price: prepared.compareAtPrice,
    cost_price: prepared.costPrice,
    currency: prepared.currency,
    box_quantity: prepared.boxQuantity,
    min_order_quantity: prepared.minOrderQuantity,
    quantity_step: prepared.quantityStep,
    inventory_quantity: prepared.inventoryQuantity,
    inventory_policy: prepared.inventoryPolicy || null,
    inventory_tracker: prepared.inventoryTracker || null,
    taxable: prepared.taxable,
    requires_shipping: prepared.requiresShipping,
    weight: prepared.weight,
    weight_unit: prepared.weightUnit || null,
    published_at: prepared.status === "published" ? prepared.now : null,
    is_wholesale_only: prepared.isWholesaleOnly,
    allow_quote_request: prepared.allowQuoteRequest,
    allow_online_checkout: prepared.allowOnlineCheckout,
    updated_at: prepared.now,
  };

  let productId = normalizeText(existingItem?.id);
  let action: "inserted" | "updated" = "updated";

  if (productId) {
    const { error: updateError } = await supabase
      .from("products")
      .update(productPayload)
      .eq("id", productId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { data: created, error: createError } = await supabase
      .from("products")
      .insert({
        ...productPayload,
        created_at: prepared.now,
      })
      .select("id")
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    productId = normalizeText(created?.id);
    action = "inserted";
  }

  if (primaryCollectionId) {
    await syncProductCollection({
      productId,
      collectionId: primaryCollectionId,
    });
  }

  if (prepared.imageUrl || prepared.gallery) {
    await syncProductImages({
      productId,
      title: prepared.title,
      imageUrl: prepared.imageUrl,
      imageFileId: prepared.imageFileId,
      imageAlt: prepared.imageAlt,
      gallery: prepared.gallery,
    });
  }

  await createOrUpdateDefaultVariant({
    productId,
    title: prepared.title,
    sku: prepared.sku,
    barcode: prepared.barcode,
    basePrice: prepared.basePrice,
    compareAtPrice: prepared.compareAtPrice,
    costPrice: prepared.costPrice,
    inventoryQuantity: prepared.inventoryQuantity,
    inventoryPolicy: prepared.inventoryPolicy,
    inventoryTracker: prepared.inventoryTracker,
    taxable: prepared.taxable,
    requiresShipping: prepared.requiresShipping,
    weight: prepared.weight,
    weightUnit: prepared.weightUnit,
    imageUrl: prepared.imageUrl,
    imageFileId: prepared.imageFileId,
    boxQuantity: prepared.boxQuantity,
    minOrderQuantity: prepared.minOrderQuantity,
    quantityStep: prepared.quantityStep,
  });

  return action;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const format = String(body?.format || "csv").trim().toLowerCase();
    const text = String(body?.text || "");

    if (!["csv", "json"].includes(format)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid import format. Use "csv" or "json".',
        },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { ok: false, error: "Import content is empty." },
        { status: 400 }
      );
    }

    const items =
      format === "json" ? parseJsonImportText(text) : parseCsvImportText(text);

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let index = 0; index < items.length; index += 1) {
      try {
        const action = await importProduct(items[index]);

        if (action === "inserted") {
          inserted += 1;
        } else {
          updated += 1;
        }
      } catch (error) {
        errors.push(
          `Row ${index + 2}: ${
            error instanceof Error ? error.message : "Unknown import error."
          }`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      inserted,
      updated,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Import failed.",
      },
      { status: 500 }
    );
  }
}