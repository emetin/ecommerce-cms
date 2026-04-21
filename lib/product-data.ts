import { cache } from "react";
import { getSheetData } from "./sheets";
import { normalizeImageUrl } from "./image-url";

export type ProductItem = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  short_description?: string;
  image?: string;
  gallery?: string;
  collection_slug?: string;
  status?: string;
  featured?: string;
  created_at?: string;
  updated_at?: string;
  seo_title?: string;
  seo_description?: string;
  vendor?: string;
  product_category?: string;
  type?: string;
  tags?: string;
};

export type ProductImageItem = {
  id?: string;
  product_slug?: string;
  image_url?: string;
  image_file_id?: string;
  image_uploaded_at?: string;
  sort_order?: string;
  alt_text?: string;
  is_main?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProductVariantItem = {
  id?: string;
  product_slug?: string;
  title?: string;
  sku?: string;
  price?: string;
  compare_at_price?: string;
  status?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  inventory?: string;
  image?: string;
};

function normalizeText(value?: string) {
  return String(value || "").trim();
}

function normalizeLower(value?: string) {
  return normalizeText(value).toLowerCase();
}

function toSafeOrder(value?: string) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : 999999;
}

function isTrue(value?: string) {
  return normalizeLower(value) === "true";
}

function hasValidSlug(item: ProductItem) {
  return Boolean(normalizeLower(item.slug));
}

function hasValidImageRecord(item: ProductImageItem) {
  return Boolean(normalizeText(item.id) || normalizeText(item.image_url));
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
    mainImage?.image_url || firstImage?.image_url || product.image || ""
  );
}

export const getAllProducts = cache(async (ttlSeconds = 1800) => {
  const productData = await getSheetData("products", { ttlSeconds });
  return (productData as ProductItem[]).filter(hasValidSlug);
});

export const getAllProductImages = cache(async (ttlSeconds = 1800) => {
  const imageData = await getSheetData("product_images", { ttlSeconds });
  return imageData as ProductImageItem[];
});

export const getAllProductVariants = cache(async (ttlSeconds = 1800) => {
  const variantData = await getSheetData("product_variants", { ttlSeconds });
  return variantData as ProductVariantItem[];
});

export const getProductsAndImages = cache(async (ttlSeconds = 1800) => {
  const [products, allProductImages] = await Promise.all([
    getAllProducts(ttlSeconds),
    getAllProductImages(ttlSeconds),
  ]);

  const imagesBySlug = groupProductImagesBySlug(allProductImages);

  return {
    products,
    allProductImages,
    imagesBySlug,
  };
});

export const getCatalogBundle = cache(async (ttlSeconds = 1800) => {
  const [products, allProductImages, allVariants] = await Promise.all([
    getAllProducts(ttlSeconds),
    getAllProductImages(ttlSeconds),
    getAllProductVariants(ttlSeconds),
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
      const aFeatured = normalizeLower(a.featured) === "true";
      const bFeatured = normalizeLower(b.featured) === "true";

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