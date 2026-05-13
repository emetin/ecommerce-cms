import { cache } from "react";
import { createAdminClient } from "./supabase/admin";
import { normalizeImageUrl } from "./image-url";

export type ProductItem = {
  id?: string;
  legacy_id?: string | null;
  title?: string;
  slug?: string;
  description?: string | null;
  short_description?: string | null;
  image?: string;
  image_url?: string | null;
  image_file_id?: string | null;
  image_alt?: string | null;
  collection_slug?: string | null;
  status?: string;
  featured?: string | boolean;
  created_at?: string;
  updated_at?: string;
  seo_title?: string | null;
  seo_description?: string | null;
  vendor?: string | null;
  product_category?: string | null;
  type?: string | null;
  product_type?: string | null;
  tags?: string | null;
  primary_collection_id?: string | null;
  primary_collection?: {
    id?: string;
    slug?: string;
    title?: string;
  } | null;
};

export type ProductImageItem = {
  id?: string;
  legacy_id?: string | null;
  product_id?: string;
  product_slug?: string;
  image_url?: string;
  image_file_id?: string | null;
  sort_order?: string | number;
  alt_text?: string | null;
  is_main?: string | boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProductVariantItem = {
  id?: string;
  legacy_id?: string | null;
  product_id?: string;
  product_slug?: string;
  title?: string | null;
  sku?: string | null;
  barcode?: string | null;
  price?: string | number | null;
  compare_at_price?: string | number | null;
  status?: string;
  option1_name?: string | null;
  option1_value?: string | null;
  option2_name?: string | null;
  option2_value?: string | null;
  option3_name?: string | null;
  option3_value?: string | null;
  inventory_tracker?: string | null;
  inventory_policy?: string | null;
  fulfillment_service?: string | null;
  requires_shipping?: boolean;
  taxable?: boolean;
  variant_image_url?: string | null;
  variant_image_file_id?: string | null;
  variant_image_legacy_id?: string | null;
  weight?: string | number | null;
  weight_unit?: string | null;
  box_quantity?: string | number | null;
  sort_order?: string | number;
};

function normalizeText(value?: string | number | boolean | null) {
  return String(value ?? "").trim();
}

function normalizeLower(value?: string | number | boolean | null) {
  return normalizeText(value).toLowerCase();
}

function toSafeOrder(value?: string | number | null) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : 999999;
}

function isTrue(value?: string | boolean | null) {
  if (typeof value === "boolean") {
    return value;
  }

  return normalizeLower(value) === "true";
}

function hasValidSlug(item: ProductItem) {
  return Boolean(normalizeLower(item.slug));
}

function hasValidImageRecord(item: ProductImageItem) {
  return Boolean(normalizeText(item.id) || normalizeText(item.image_url));
}

function mapProductFromSupabase(row: ProductItem): ProductItem {
  const collectionSlug = row.primary_collection?.slug || row.collection_slug || "";

  return {
    ...row,
    image: row.image_url || row.image || "",
    type: row.product_type || row.type || "",
    collection_slug: collectionSlug,
    featured: Boolean(row.featured),
  };
}

function mapImageFromSupabase(row: ProductImageItem & { products?: ProductItem | null }) {
  return {
    ...row,
    product_slug: row.products?.slug || row.product_slug || "",
  };
}

function mapVariantFromSupabase(row: ProductVariantItem & { products?: ProductItem | null }) {
  return {
    ...row,
    product_slug: row.products?.slug || row.product_slug || "",
  };
}

export function sortProductImages(images: ProductImageItem[]) {
  return [...images].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    const byOrder = toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
    if (byOrder !== 0) return byOrder;

    return normalizeText(a.id).localeCompare(normalizeText(b.id));
  });
}

export function groupProductImagesBySlug(productImages: ProductImageItem[]) {
  const grouped = new Map<string, ProductImageItem[]>();

  for (const item of productImages) {
    if (!hasValidImageRecord(item)) continue;

    const slug = normalizeLower(item.product_slug);
    if (!slug) continue;

    const current = grouped.get(slug);
    if (current) {
      current.push(item);
    } else {
      grouped.set(slug, [item]);
    }
  }

  for (const [slug, items] of grouped.entries()) {
    grouped.set(slug, sortProductImages(items));
  }

  return grouped;
}

export function groupVariantsBySlug(variants: ProductVariantItem[]) {
  const grouped = new Map<string, ProductVariantItem[]>();

  for (const item of variants) {
    const slug = normalizeLower(item.product_slug);
    if (!slug) continue;

    const status = normalizeLower(item.status);
    if (!["", "published", "active"].includes(status)) continue;

    const current = grouped.get(slug);
    if (current) {
      current.push(item);
    } else {
      grouped.set(slug, [item]);
    }
  }

  return grouped;
}

export function getPrimaryProductImage(
  product: ProductItem,
  productImages: ProductImageItem[]
) {
  const mainImage = productImages.find((item) => isTrue(item.is_main));
  const firstImage = productImages[0];

  return normalizeImageUrl(
    mainImage?.image_url || firstImage?.image_url || product.image_url || product.image || ""
  );
}

export const getAllProducts = cache(async () => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      primary_collection:collections!products_primary_collection_id_fkey (
        id,
        slug,
        title
      )
    `
    )
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch products from Supabase: ${error.message}`);
  }

  return ((data || []) as ProductItem[]).map(mapProductFromSupabase).filter(hasValidSlug);
});

export const getAllProductImages = cache(async () => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("product_images")
    .select(
      `
      *,
      products (
        id,
        slug,
        title
      )
    `
    )
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch product images from Supabase: ${error.message}`);
  }

  return ((data || []) as Array<ProductImageItem & { products?: ProductItem | null }>).map(
    mapImageFromSupabase
  );
});

export const getAllProductVariants = cache(async () => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("product_variants")
    .select(
      `
      *,
      products (
        id,
        slug,
        title
      )
    `
    )
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch product variants from Supabase: ${error.message}`);
  }

  return ((data || []) as Array<ProductVariantItem & { products?: ProductItem | null }>).map(
    mapVariantFromSupabase
  );
});

export const getProductsAndImages = cache(async () => {
  const [products, allProductImages] = await Promise.all([
    getAllProducts(),
    getAllProductImages(),
  ]);

  const imagesBySlug = groupProductImagesBySlug(allProductImages);

  return {
    products,
    allProductImages,
    imagesBySlug,
  };
});

export const getCatalogBundle = cache(async () => {
  const [products, allProductImages, allVariants] = await Promise.all([
    getAllProducts(),
    getAllProductImages(),
    getAllProductVariants(),
  ]);

  return {
    products,
    allProductImages,
    allVariants,
    imagesBySlug: groupProductImagesBySlug(allProductImages),
    variantsBySlug: groupVariantsBySlug(allVariants),
  };
});

export function getPublishedProducts(products: ProductItem[]) {
  return products
    .filter(
      (item) =>
        hasValidSlug(item) && normalizeLower(item.status) === "published"
    )
    .sort((a, b) => {
      const aFeatured = isTrue(a.featured);
      const bFeatured = isTrue(b.featured);

      if (aFeatured !== bFeatured) {
        return aFeatured ? -1 : 1;
      }

      return normalizeText(a.title).localeCompare(normalizeText(b.title));
    });
}

export function findPublishedProductBySlug(
  products: ProductItem[],
  slug: string
) {
  const normalizedSlug = normalizeLower(slug);

  return (
    products.find(
      (item) =>
        normalizeLower(item.slug) === normalizedSlug &&
        normalizeLower(item.status) === "published"
    ) || null
  );
}

export function findRelatedProducts(
  products: ProductItem[],
  currentProduct: ProductItem,
  limit = 3
) {
  const currentSlug = normalizeLower(currentProduct.slug);
  const currentCollectionSlug = normalizeLower(currentProduct.collection_slug);

  if (!currentCollectionSlug) {
    return [];
  }

  return getPublishedProducts(products)
    .filter((item) => {
      const itemSlug = normalizeLower(item.slug);
      const itemCollectionSlug = normalizeLower(item.collection_slug);

      return itemSlug !== currentSlug && itemCollectionSlug === currentCollectionSlug;
    })
    .slice(0, limit);
}