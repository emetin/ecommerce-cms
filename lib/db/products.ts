import { createSupabaseAdminClient } from "../supabase/admin";

export const PRODUCT_STATUSES = ["published", "draft", "archived"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type ProductListParams = {
  status?: string | null;
  q?: string | null;
  page?: number;
  limit?: number;
};

export type ProductDetailParams = {
  slug: string;
};

type SupabaseProductVariant = {
  id: string;
  product_id: string;
  title: string | null;
  sku: string | null;
  barcode: string | null;
  option1_name: string | null;
  option1_value: string | null;
  option2_name: string | null;
  option2_value: string | null;
  option3_name: string | null;
  option3_value: string | null;
  price: number | string | null;
  compare_at_price: number | string | null;
  cost_price?: number | string | null;
  inventory_quantity?: number | null;
  inventory_policy: string | null;
  inventory_tracker: string | null;
  fulfillment_service?: string | null;
  requires_shipping: boolean | null;
  taxable: boolean | null;
  variant_image_url: string | null;
  variant_image_file_id: string | null;
  weight: number | string | null;
  weight_unit: string | null;
  box_quantity: number | null;
  min_order_quantity: number | null;
  quantity_step: number | null;
  status: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type SupabaseProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  image_file_id: string | null;
  alt_text: string | null;
  sort_order: number | null;
  is_main: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type SupabaseCollection = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  image_file_id: string | null;
  image_alt: string | null;
  status: string | null;
  sort_order: number | null;
  seo_title: string | null;
  seo_description: string | null;
};

type SupabaseProductCollection = {
  id: string;
  product_id: string;
  collection_id: string;
  sort_order: number | null;
  collections: SupabaseCollection | null;
};

type SupabaseProductOptionValue = {
  id: string;
  option_id: string;
  product_id: string;
  value: string;
  position: number | null;
};

type SupabaseProductOption = {
  id: string;
  product_id: string;
  name: string;
  position: number | null;
  product_option_values?: SupabaseProductOptionValue[];
};

type SupabaseProduct = {
  id: string;
  legacy_id?: string | null;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  primary_collection_id: string | null;
  status: string | null;
  featured: boolean | null;
  image_url: string | null;
  image_file_id: string | null;
  image_alt: string | null;
  vendor: string | null;
  product_category: string | null;
  product_type: string | null;
  tags: string | null;
  seo_title: string | null;
  seo_description: string | null;
  handle?: string | null;
  sku?: string | null;
  barcode?: string | null;
  base_price?: number | string | null;
  compare_at_price?: number | string | null;
  cost_price?: number | string | null;
  currency?: string | null;
  box_quantity?: number | null;
  min_order_quantity?: number | null;
  quantity_step?: number | null;
  inventory_quantity?: number | null;
  inventory_policy?: string | null;
  inventory_tracker?: string | null;
  taxable?: boolean | null;
  requires_shipping?: boolean | null;
  weight?: number | string | null;
  weight_unit?: string | null;
  published_at?: string | null;
  is_wholesale_only?: boolean | null;
  allow_quote_request?: boolean | null;
  allow_online_checkout?: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  product_variants?: SupabaseProductVariant[];
  product_images?: SupabaseProductImage[];
  product_collections?: SupabaseProductCollection[];
  product_options?: SupabaseProductOption[];
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function toInteger(value: unknown) {
  const number = Number(value);

  return Number.isInteger(number) ? number : null;
}

function normalizeLimit(value: unknown) {
  const number = Number(value || 50);

  if (!Number.isFinite(number) || number <= 0) return 50;

  return Math.min(number, 200);
}

function normalizePage(value: unknown) {
  const number = Number(value || 1);

  if (!Number.isFinite(number) || number <= 0) return 1;

  return Math.floor(number);
}

function isAllowedStatus(value: string) {
  return PRODUCT_STATUSES.includes(value as ProductStatus);
}

function sortBySortOrder<
  T extends {
    sort_order?: number | null;
    created_at?: string | null;
  }
>(items: T[] | null | undefined) {
  return [...(items || [])].sort((a, b) => {
    const aSort = a.sort_order ?? 0;
    const bSort = b.sort_order ?? 0;

    if (aSort !== bSort) return aSort - bSort;

    return normalizeText(a.created_at).localeCompare(
      normalizeText(b.created_at)
    );
  });
}

function getMainImage(product: SupabaseProduct) {
  const images = sortBySortOrder(product.product_images);

  const mainImage = images.find((image) => image.is_main) || images[0] || null;

  return {
    image_url: product.image_url || mainImage?.image_url || "",
    image_file_id: product.image_file_id || mainImage?.image_file_id || "",
    image_alt: product.image_alt || mainImage?.alt_text || product.title || "",
  };
}

function isDefaultVariantTitle(value: unknown) {
  const normalized = normalizeLower(value);

  return (
    normalized === "" ||
    normalized === "default" ||
    normalized === "default title" ||
    normalized === "title"
  );
}

function normalizeVariant(
  variant: SupabaseProductVariant,
  product: SupabaseProduct
) {
  const productBoxQuantity = toInteger(product.box_quantity) || 1;
  const productMinOrderQuantity =
    toInteger(product.min_order_quantity) || productBoxQuantity;
  const productQuantityStep =
    toInteger(product.quantity_step) || productBoxQuantity;

  const variantBoxQuantity =
    toInteger(variant.box_quantity) || productBoxQuantity;
  const variantMinOrderQuantity =
    toInteger(variant.min_order_quantity) || productMinOrderQuantity;
  const variantQuantityStep =
    toInteger(variant.quantity_step) || productQuantityStep;

  return {
    id: variant.id,
    product_id: variant.product_id,
    title: variant.title || "Default Title",
    sku: variant.sku || "",
    barcode: variant.barcode || "",
    option1_name: variant.option1_name || "",
    option1_value: variant.option1_value || "",
    option2_name: variant.option2_name || "",
    option2_value: variant.option2_value || "",
    option3_name: variant.option3_name || "",
    option3_value: variant.option3_value || "",
    price: toNumber(variant.price),
    compare_at_price: toNumber(variant.compare_at_price),
    cost_price: toNumber(variant.cost_price),
    inventory_quantity: variant.inventory_quantity ?? null,
    inventory_policy: variant.inventory_policy || "",
    inventory_tracker: variant.inventory_tracker || "",
    requires_shipping: variant.requires_shipping ?? true,
    taxable: variant.taxable ?? true,
    image_url: variant.variant_image_url || "",
    image_file_id: variant.variant_image_file_id || "",
    weight: toNumber(variant.weight),
    weight_unit: variant.weight_unit || "",
    box_quantity: variantBoxQuantity,
    min_order_quantity: variantMinOrderQuantity,
    quantity_step: variantQuantityStep,
    status: variant.status || "active",
    sort_order: variant.sort_order ?? 0,
    created_at: variant.created_at || "",
    updated_at: variant.updated_at || "",
    is_default: isDefaultVariantTitle(variant.title),
  };
}

function normalizeImage(image: SupabaseProductImage) {
  return {
    id: image.id,
    product_id: image.product_id,
    image_url: image.image_url,
    image_file_id: image.image_file_id || "",
    alt_text: image.alt_text || "",
    sort_order: image.sort_order ?? 0,
    is_main: Boolean(image.is_main),
    created_at: image.created_at || "",
    updated_at: image.updated_at || "",
  };
}

function normalizeCollectionLink(link: SupabaseProductCollection) {
  const collection = link.collections;

  if (!collection) return null;

  return {
    id: collection.id,
    title: collection.title,
    slug: collection.slug,
    description: collection.description || "",
    image_url: collection.image_url || "",
    image_file_id: collection.image_file_id || "",
    image_alt: collection.image_alt || "",
    status: collection.status || "",
    sort_order: collection.sort_order ?? 0,
    seo_title: collection.seo_title || "",
    seo_description: collection.seo_description || "",
  };
}

function normalizeOption(option: SupabaseProductOption) {
  return {
    id: option.id,
    product_id: option.product_id,
    name: option.name,
    position: option.position ?? 0,
    values: [...(option.product_option_values || [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((value) => ({
        id: value.id,
        value: value.value,
        position: value.position ?? 0,
      })),
  };
}

function normalizeProductListItem(product: SupabaseProduct) {
  const mainImage = getMainImage(product);

  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    handle: product.handle || product.slug,
    image: mainImage.image_url,
    image_url: mainImage.image_url,
    image_file_id: mainImage.image_file_id,
    image_alt: mainImage.image_alt,
    collection_id: product.primary_collection_id || "",
    status: product.status || "",
    featured: Boolean(product.featured),
    updated_at: product.updated_at || "",
    short_description: product.short_description || "",
    vendor: product.vendor || "",
    product_category: product.product_category || "",
    product_type: product.product_type || "",
    tags: product.tags || "",
    base_price: toNumber(product.base_price),
    compare_at_price: toNumber(product.compare_at_price),
    currency: product.currency || "USD",
    box_quantity: toInteger(product.box_quantity) || 1,
    min_order_quantity:
      toInteger(product.min_order_quantity) ||
      toInteger(product.box_quantity) ||
      1,
    quantity_step:
      toInteger(product.quantity_step) || toInteger(product.box_quantity) || 1,
    is_wholesale_only: product.is_wholesale_only ?? true,
    allow_quote_request: product.allow_quote_request ?? true,
    allow_online_checkout: product.allow_online_checkout ?? false,
    created_at: product.created_at || "",
  };
}

function normalizeProductDetail(product: SupabaseProduct) {
  const mainImage = getMainImage(product);

  const variants = sortBySortOrder(product.product_variants)
    .filter((variant) => normalizeLower(variant.status) === "active")
    .map((variant) => normalizeVariant(variant, product));

  const images = sortBySortOrder(product.product_images).map(normalizeImage);

  const collections = (product.product_collections || [])
    .map(normalizeCollectionLink)
    .filter(Boolean);

  const options = sortBySortOrder(product.product_options).map(normalizeOption);

  const hasOnlyDefaultVariant =
    variants.length === 1 && Boolean(variants[0]?.is_default);

  const shouldShowVariantSelector = !hasOnlyDefaultVariant;

  const selectedVariant = variants[0] || null;

  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    handle: product.handle || product.slug,
    description: product.description || "",
    short_description: product.short_description || "",
    primary_collection_id: product.primary_collection_id || "",
    status: product.status || "",
    featured: Boolean(product.featured),
    image: mainImage.image_url,
    image_url: mainImage.image_url,
    image_file_id: mainImage.image_file_id,
    image_alt: mainImage.image_alt,
    vendor: product.vendor || "",
    product_category: product.product_category || "",
    product_type: product.product_type || "",
    tags: product.tags || "",
    seo_title: product.seo_title || "",
    seo_description: product.seo_description || "",
    base_price: toNumber(product.base_price),
    compare_at_price: toNumber(product.compare_at_price),
    cost_price: toNumber(product.cost_price),
    currency: product.currency || "USD",
    sku: product.sku || selectedVariant?.sku || "",
    barcode: product.barcode || selectedVariant?.barcode || "",
    box_quantity:
      toInteger(product.box_quantity) || selectedVariant?.box_quantity || 1,
    min_order_quantity:
      toInteger(product.min_order_quantity) ||
      selectedVariant?.min_order_quantity ||
      1,
    quantity_step:
      toInteger(product.quantity_step) || selectedVariant?.quantity_step || 1,
    taxable: product.taxable ?? true,
    requires_shipping: product.requires_shipping ?? true,
    weight: toNumber(product.weight),
    weight_unit: product.weight_unit || "",
    published_at: product.published_at || "",
    is_wholesale_only: product.is_wholesale_only ?? true,
    allow_quote_request: product.allow_quote_request ?? true,
    allow_online_checkout: product.allow_online_checkout ?? false,
    created_at: product.created_at || "",
    updated_at: product.updated_at || "",
    variants,
    images,
    collections,
    options,
    selected_variant: selectedVariant,
    has_only_default_variant: hasOnlyDefaultVariant,
    should_show_variant_selector: shouldShowVariantSelector,
  };
}

export async function getProductsList(params: ProductListParams) {
  const supabase = createSupabaseAdminClient();

  const status = normalizeLower(params.status);
  const query = normalizeText(params.q);
  const page = normalizePage(params.page);
  const limit = normalizeLimit(params.limit);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (status && !isAllowedStatus(status)) {
    throw new Error("Invalid status filter.");
  }

  let request = supabase
    .from("products")
    .select(
      `
      id,
      title,
      slug,
      handle,
      short_description,
      primary_collection_id,
      status,
      featured,
      image_url,
      image_file_id,
      image_alt,
      vendor,
      product_category,
      product_type,
      tags,
      base_price,
      compare_at_price,
      currency,
      box_quantity,
      min_order_quantity,
      quantity_step,
      is_wholesale_only,
      allow_quote_request,
      allow_online_checkout,
      created_at,
      updated_at,
      product_images (
        id,
        product_id,
        image_url,
        image_file_id,
        alt_text,
        sort_order,
        is_main,
        created_at,
        updated_at
      )
    `,
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (status) {
    request = request.eq("status", status);
  }

  if (query) {
    const safeQuery = query.replace(/[%]/g, "");

    request = request.or(
      [
        `title.ilike.%${safeQuery}%`,
        `slug.ilike.%${safeQuery}%`,
        `short_description.ilike.%${safeQuery}%`,
        `vendor.ilike.%${safeQuery}%`,
        `product_type.ilike.%${safeQuery}%`,
        `product_category.ilike.%${safeQuery}%`,
        `tags.ilike.%${safeQuery}%`,
      ].join(",")
    );
  }

  const { data, count, error } = await request;

  if (error) {
    throw new Error(error.message);
  }

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    total,
    page,
    limit,
    totalPages,
    items: (data || []).map((product) =>
      normalizeProductListItem(product as SupabaseProduct)
    ),
  };
}

export async function getProductBySlug(params: ProductDetailParams) {
  const supabase = createSupabaseAdminClient();
  const slug = normalizeText(params.slug);

  if (!slug) {
    throw new Error("Product slug is required.");
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_variants (
        id,
        product_id,
        title,
        sku,
        barcode,
        option1_name,
        option1_value,
        option2_name,
        option2_value,
        option3_name,
        option3_value,
        price,
        compare_at_price,
        cost_price,
        inventory_quantity,
        inventory_policy,
        inventory_tracker,
        fulfillment_service,
        requires_shipping,
        taxable,
        variant_image_url,
        variant_image_file_id,
        weight,
        weight_unit,
        box_quantity,
        min_order_quantity,
        quantity_step,
        status,
        sort_order,
        created_at,
        updated_at
      ),
      product_images (
        id,
        product_id,
        image_url,
        image_file_id,
        alt_text,
        sort_order,
        is_main,
        created_at,
        updated_at
      ),
      product_collections (
        id,
        product_id,
        collection_id,
        sort_order,
        collections (
          id,
          title,
          slug,
          description,
          image_url,
          image_file_id,
          image_alt,
          status,
          sort_order,
          seo_title,
          seo_description
        )
      ),
      product_options (
        id,
        product_id,
        name,
        position,
        product_option_values (
          id,
          option_id,
          product_id,
          value,
          position
        )
      )
    `
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return normalizeProductDetail(data as SupabaseProduct);
}