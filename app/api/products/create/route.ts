import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../lib/api/admin";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

type ProductRecord = {
  id?: string;
  title?: string;
  slug?: string;
  handle?: string;
  description?: string;
  short_description?: string;
  image?: string;
  image_url?: string;
  image_file_id?: string;
  image_alt?: string;
  gallery?: string;
  collection_slug?: string;
  primary_collection_id?: string;
  status?: string;
  featured?: string | boolean;
  seo_title?: string;
  seo_description?: string;
  created_at?: string;
  updated_at?: string;
  vendor?: string;
  product_category?: string;
  type?: string;
  product_type?: string;
  tags?: string;

  sku?: string;
  barcode?: string;
  base_price?: string | number;
  compare_at_price?: string | number;
  cost_price?: string | number;
  currency?: string;
  box_quantity?: string | number;
  min_order_quantity?: string | number;
  quantity_step?: string | number;
  inventory_quantity?: string | number;
  inventory_policy?: string;
  inventory_tracker?: string;
  taxable?: string | boolean;
  requires_shipping?: string | boolean;
  weight?: string | number;
  weight_unit?: string;
  is_wholesale_only?: string | boolean;
  allow_quote_request?: string | boolean;
  allow_online_checkout?: string | boolean;
  create_default_variant?: string | boolean;
};

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
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeStatus(value: unknown) {
  return String(value || "draft").trim().toLowerCase();
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

function normalizeBooleanString(value: unknown, fallback = "false") {
  return normalizeBoolean(value, fallback === "true") ? "true" : "false";
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

  const floored = Math.floor(number);

  return floored >= 0 ? floored : null;
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

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    await requireAdminFromRequest(req);

    const body = (await req.json().catch(() => ({}))) as ProductRecord;

    const title = normalizeText(body?.title);
    const slugInput = normalizeText(body?.slug);
    const handleInput = normalizeText(body?.handle);
    const description = normalizeText(body?.description);
    const shortDescription = normalizeText(body?.short_description);
    const image = normalizeText(body?.image_url || body?.image);
    const imageFileId = normalizeText(body?.image_file_id);
    const imageAlt = normalizeText(body?.image_alt || title);
    const gallery = normalizeText(body?.gallery);
    const collectionSlug = normalizeLower(body?.collection_slug);
    const status = normalizeStatus(body?.status);
    const featured = normalizeBooleanString(body?.featured, "false");
    const seoTitle = normalizeText(body?.seo_title);
    const seoDescription = normalizeText(body?.seo_description);
    const vendor = normalizeText(body?.vendor);
    const productCategory = normalizeText(body?.product_category);
    const type = normalizeText(body?.type || body?.product_type);
    const tags = normalizeText(body?.tags);

    const sku = normalizeText(body?.sku);
    const barcode = normalizeText(body?.barcode);
    const basePrice = toNumberOrNull(body?.base_price);
    const compareAtPrice = toNumberOrNull(body?.compare_at_price);
    const costPrice = toNumberOrNull(body?.cost_price);
    const currency = normalizeText(body?.currency || "USD") || "USD";

    const boxQuantity = toPositiveInteger(body?.box_quantity, 1);
    const minOrderQuantity = toPositiveInteger(
      body?.min_order_quantity,
      boxQuantity
    );
    const quantityStep = toPositiveInteger(body?.quantity_step, boxQuantity);

    const inventoryQuantity = toIntegerOrNull(body?.inventory_quantity);
    const inventoryPolicy = normalizeText(body?.inventory_policy || "deny");
    const inventoryTracker = normalizeText(body?.inventory_tracker);
    const taxable = normalizeBoolean(body?.taxable, true);
    const requiresShipping = normalizeBoolean(body?.requires_shipping, true);
    const weight = toNumberOrNull(body?.weight);
    const weightUnit = normalizeText(body?.weight_unit || "lb");

    const isWholesaleOnly = normalizeBoolean(body?.is_wholesale_only, true);
    const allowQuoteRequest = normalizeBoolean(body?.allow_quote_request, true);
    const allowOnlineCheckout = normalizeBoolean(
      body?.allow_online_checkout,
      false
    );

    if (!title) {
      return jsonError("Title is required.", 400);
    }

    const finalSlug = makeSlug(slugInput || title);
    const finalHandle = makeSlug(handleInput || finalSlug);

    if (!finalSlug) {
      return jsonError("A valid slug could not be generated.", 400);
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return jsonError(
        'Status must be one of: "published", "draft", or "archived".',
        400
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: existingSlug, error: existingSlugError } = await supabase
      .from("products")
      .select("id, slug")
      .eq("slug", finalSlug)
      .maybeSingle();

    if (existingSlugError) {
      throw new Error(existingSlugError.message);
    }

    if (existingSlug) {
      return jsonError("This slug is already in use.", 400);
    }

    const { data: existingTitle, error: existingTitleError } = await supabase
      .from("products")
      .select("id, title")
      .ilike("title", title)
      .maybeSingle();

    if (existingTitleError) {
      throw new Error(existingTitleError.message);
    }

    if (existingTitle) {
      return jsonError("A product with this title already exists.", 400);
    }

    let primaryCollectionId = normalizeText(body?.primary_collection_id);

    if (!primaryCollectionId && collectionSlug) {
      const { data: collection, error: collectionError } = await supabase
        .from("collections")
        .select("id, slug")
        .eq("slug", collectionSlug)
        .maybeSingle();

      if (collectionError) {
        throw new Error(collectionError.message);
      }

      primaryCollectionId = normalizeText(collection?.id);
    }

    const now = new Date().toISOString();
    const finalSeoTitle = seoTitle || title;
    const finalSeoDescription =
      seoDescription || shortDescription || description;

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        title,
        slug: finalSlug,
        handle: finalHandle,
        description: description || null,
        short_description: shortDescription || null,
        image_url: image || null,
        image_file_id: imageFileId || null,
        image_alt: imageAlt || null,
        primary_collection_id: primaryCollectionId || null,
        status,
        featured: featured === "true",
        seo_title: finalSeoTitle || null,
        seo_description: finalSeoDescription || null,
        vendor: vendor || null,
        product_category: productCategory || null,
        product_type: type || null,
        tags: tags || null,
        sku: sku || null,
        barcode: barcode || null,
        base_price: basePrice,
        compare_at_price: compareAtPrice,
        cost_price: costPrice,
        currency,
        box_quantity: boxQuantity,
        min_order_quantity: minOrderQuantity,
        quantity_step: quantityStep,
        inventory_quantity: inventoryQuantity,
        inventory_policy: inventoryPolicy || null,
        inventory_tracker: inventoryTracker || null,
        taxable,
        requires_shipping: requiresShipping,
        weight,
        weight_unit: weightUnit || null,
        published_at: status === "published" ? now : null,
        is_wholesale_only: isWholesaleOnly,
        allow_quote_request: allowQuoteRequest,
        allow_online_checkout: allowOnlineCheckout,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (productError) {
      throw new Error(productError.message);
    }

    if (primaryCollectionId) {
      const { error: collectionLinkError } = await supabase
        .from("product_collections")
        .upsert(
          {
            product_id: product.id,
            collection_id: primaryCollectionId,
            sort_order: 0,
          },
          {
            onConflict: "product_id,collection_id",
          }
        );

      if (collectionLinkError) {
        throw new Error(collectionLinkError.message);
      }
    }

    const galleryImages = splitGallery(gallery);
    const imageRows: Array<Record<string, unknown>> = [];

    if (image) {
      imageRows.push({
        product_id: product.id,
        image_url: image,
        image_file_id: imageFileId || null,
        alt_text: imageAlt || title,
        sort_order: 0,
        is_main: true,
        created_at: now,
        updated_at: now,
      });
    }

    galleryImages.forEach((galleryImage, index) => {
      if (!galleryImage || galleryImage === image) {
        return;
      }

      imageRows.push({
        product_id: product.id,
        image_url: galleryImage,
        image_file_id: null,
        alt_text: imageAlt || title,
        sort_order: index + 1,
        is_main: !image && index === 0,
        created_at: now,
        updated_at: now,
      });
    });

    if (imageRows.length > 0) {
      const { error: imageError } = await supabase
        .from("product_images")
        .insert(imageRows);

      if (imageError) {
        throw new Error(imageError.message);
      }
    }

    const shouldCreateDefaultVariant = normalizeBoolean(
      body?.create_default_variant,
      true
    );

    let defaultVariant = null;

    if (shouldCreateDefaultVariant) {
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .insert({
          product_id: product.id,
          title: "Default Title",
          sku: sku || null,
          barcode: barcode || null,
          option1_name: null,
          option1_value: null,
          option2_name: null,
          option2_value: null,
          option3_name: null,
          option3_value: null,
          price: basePrice,
          compare_at_price: compareAtPrice,
          cost_price: costPrice,
          inventory_quantity: inventoryQuantity,
          inventory_policy: inventoryPolicy || null,
          inventory_tracker: inventoryTracker || null,
          fulfillment_service: "manual",
          requires_shipping: requiresShipping,
          taxable,
          variant_image_url: image || null,
          variant_image_file_id: imageFileId || null,
          weight,
          weight_unit: weightUnit || null,
          box_quantity: boxQuantity,
          min_order_quantity: minOrderQuantity,
          quantity_step: quantityStep,
          status: "active",
          sort_order: 0,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (variantError) {
        throw new Error(variantError.message);
      }

      defaultVariant = variant;
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Product created successfully.",
        item: {
          id: product.id,
          title,
          slug: finalSlug,
          handle: finalHandle,
          description,
          short_description: shortDescription,
          image,
          image_url: image,
          image_file_id: imageFileId,
          image_alt: imageAlt,
          gallery,
          collection_slug: collectionSlug,
          primary_collection_id: primaryCollectionId,
          status,
          featured,
          seo_title: finalSeoTitle,
          seo_description: finalSeoDescription,
          created_at: now,
          updated_at: now,
          vendor,
          product_category: productCategory,
          type,
          product_type: type,
          tags,
          sku,
          barcode,
          base_price: basePrice,
          compare_at_price: compareAtPrice,
          cost_price: costPrice,
          currency,
          box_quantity: boxQuantity,
          min_order_quantity: minOrderQuantity,
          quantity_step: quantityStep,
          inventory_quantity: inventoryQuantity,
          inventory_policy: inventoryPolicy,
          inventory_tracker: inventoryTracker,
          taxable,
          requires_shipping: requiresShipping,
          weight,
          weight_unit: weightUnit,
          is_wholesale_only: isWholesaleOnly,
          allow_quote_request: allowQuoteRequest,
          allow_online_checkout: allowOnlineCheckout,
        },
        product,
        default_variant: defaultVariant,
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while creating the product."
    );
  }
}