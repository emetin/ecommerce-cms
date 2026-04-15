import {
  findSheetItemByField,
  findSheetItemsByField,
} from "./sheets";
import { toNumber } from "./money";

export type CatalogProduct = {
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
  seo_title?: string;
  seo_description?: string;
  vendor?: string;
  product_category?: string;
  type?: string;
  tags?: string;
};

export type CatalogVariant = {
  id?: string;
  product_slug?: string;
  title?: string;
  name?: string;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  sku?: string;
  price?: string;
  compare_at_price?: string;
  variant_image?: string;
  image_id?: string;
  status?: string;
};

function normalize(value?: string) {
  return String(value || "").trim();
}

function normalizeLower(value?: string) {
  return normalize(value).toLowerCase();
}

function buildVariantTitle(variant: CatalogVariant | null) {
  if (!variant) return "";

  const directTitle = normalize(variant.title || variant.name);
  if (directTitle) return directTitle;

  const values = [
    normalize(variant.option1_value),
    normalize(variant.option2_value),
    normalize(variant.option3_value),
  ].filter((item) => item && item.toLowerCase() !== "default");

  if (values.length) {
    return values.join(" / ");
  }

  return normalize(variant.sku) || "Default";
}

export async function resolveCartCatalogItem(
  productSlug: string,
  variantId?: string
) {
  const normalizedProductSlug = normalizeLower(productSlug);
  const normalizedVariantId = normalize(variantId);

  if (!normalizedProductSlug) {
    throw new Error("product_slug is required.");
  }

  const product = await findSheetItemByField<CatalogProduct>(
    "products",
    "slug",
    normalizedProductSlug,
    { forceFresh: true, ttlSeconds: 0 }
  );

  if (!product) {
    throw new Error("Product not found.");
  }

  if (normalizeLower(product.status) !== "published") {
    throw new Error("Product is not available.");
  }

  const variantsRaw = await findSheetItemsByField<Record<string, string>>(
    "product_variants",
    "product_slug",
    normalizedProductSlug,
    { forceFresh: true, ttlSeconds: 0 }
  );

  const variants = variantsRaw as CatalogVariant[];

  const activeVariants = variants.filter((variant) =>
    ["", "published", "active"].includes(normalizeLower(variant.status))
  );

  let selectedVariant: CatalogVariant | null = null;

  if (normalizedVariantId) {
    selectedVariant =
      activeVariants.find(
        (variant) => normalize(variant.id) === normalizedVariantId
      ) || null;

    if (!selectedVariant) {
      throw new Error("Selected variant could not be found.");
    }
  } else if (activeVariants.length > 0) {
    selectedVariant = activeVariants[0];
  }

  const unitPrice = toNumber(selectedVariant?.price ?? "0");
  const compareAtPrice = toNumber(selectedVariant?.compare_at_price ?? "0");

  return {
    product,
    variant: selectedVariant,
    productTitle: normalize(product.title) || "Product",
    variantTitle: buildVariantTitle(selectedVariant),
    sku: normalize(selectedVariant?.sku),
    image:
      normalize(selectedVariant?.variant_image) ||
      normalize(selectedVariant?.image_id) ||
      normalize(product.image),
    unitPrice,
    compareAtPrice,
  };
}