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
  sort_order?: string;
  alt_text?: string;
  is_main?: string;
  created_at?: string;
  updated_at?: string;
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
  const map = new Map<string, ProductImageItem[]>();

  for (const item of productImages) {
    const slug = normalizeLower(item.product_slug);
    if (!slug) continue;

    const existing = map.get(slug);

    if (existing) {
      existing.push(item);
    } else {
      map.set(slug, [item]);
    }
  }

  for (const [slug, items] of map.entries()) {
    map.set(slug, sortProductImages(items));
  }

  return map;
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

export async function getProductsAndImages() {
  const [productData, imageData] = await Promise.all([
    getSheetData("products"),
    getSheetData("product_images"),
  ]);

  const products = productData as ProductItem[];
  const allProductImages = imageData as ProductImageItem[];
  const imagesBySlug = groupProductImagesBySlug(allProductImages);

  return {
    products,
    allProductImages,
    imagesBySlug,
  };
}

export function getPublishedProducts(products: ProductItem[]) {
  return products
    .filter((item) => normalizeLower(item.status) === "published")
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