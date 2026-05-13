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
  min_quantity?: string;
  box_quantity?: string;
  case_quantity?: string;
  step_quantity?: string;
  status?: string;
};

export type ResolvedCartCatalogItem = {
  product: CatalogProduct;
  variant: CatalogVariant | null;
  productTitle: string;
  variantTitle: string;
  sku: string;
  image: string;
  unitPrice: number;
  compareAtPrice: number;
  minQuantity: number;
  boxQuantity: number;
  caseQuantity: number;
  stepQuantity: number;
};

const CATALOG_LOOKUP_TTL_SECONDS = 60;

function normalize(value?: string | number | null) {
  return String(value ?? "").trim();
}

function normalizeLower(value?: string | number | null) {
  return normalize(value).toLowerCase();
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
}

function buildVariantTitle(variant: CatalogVariant | null) {
  if (!variant) return "";

  const directTitle = normalize(variant.title || variant.name);

  if (directTitle) {
    return directTitle;
  }

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

function getVariantQuantityRules(variant: CatalogVariant | null) {
  const minQuantity = toPositiveInteger(variant?.min_quantity, 1);
  const boxQuantity = toPositiveInteger(variant?.box_quantity, 0);
  const caseQuantity = toPositiveInteger(variant?.case_quantity, 0);

  const stepQuantity =
    toPositiveInteger(variant?.step_quantity, 0) ||
    caseQuantity ||
    boxQuantity ||
    minQuantity ||
    1;

  return {
    minQuantity,
    boxQuantity,
    caseQuantity,
    stepQuantity,
  };
}

export async function resolveCartCatalogItem(
  productSlug: string,
  variantId?: string
): Promise<ResolvedCartCatalogItem> {
  const normalizedProductSlug = normalizeLower(productSlug);
  const normalizedVariantId = normalize(variantId);

  if (!normalizedProductSlug) {
    throw new Error("product_slug is required.");
  }

  const productRaw = await findSheetItemByField(
    "products",
    "slug",
    normalizedProductSlug,
    {
      forceFresh: false,
      ttlSeconds: CATALOG_LOOKUP_TTL_SECONDS,
    }
  );

  const product = productRaw as CatalogProduct | null;

  if (!product) {
    throw new Error("Product not found.");
  }

  if (normalizeLower(product.status) !== "published") {
    throw new Error("Product is not available.");
  }

  const variantsRaw = await findSheetItemsByField(
    "product_variants",
    "product_slug",
    normalizedProductSlug,
    {
      forceFresh: false,
      ttlSeconds: CATALOG_LOOKUP_TTL_SECONDS,
    }
  );

  const variants = (variantsRaw as CatalogVariant[]) || [];

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
  const quantityRules = getVariantQuantityRules(selectedVariant);

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
    minQuantity: quantityRules.minQuantity,
    boxQuantity: quantityRules.boxQuantity,
    caseQuantity: quantityRules.caseQuantity,
    stepQuantity: quantityRules.stepQuantity,
  };
}