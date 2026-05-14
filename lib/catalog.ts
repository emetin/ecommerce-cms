import {
  getCatalogBundle,
  type ProductItem,
  type ProductVariantItem,
} from "./product-data";
import { toNumber } from "./money";

export type CatalogProduct = ProductItem;
export type CatalogVariant = ProductVariantItem;

export type ResolvedCartCatalogItem = {
  product: CatalogProduct;
  variant: CatalogVariant | null;
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  image: string;
  unitPrice: number;
  compareAtPrice: number;
  boxQuantity: number;
};

function normalize(value?: string | number | boolean | null) {
  return String(value ?? "").trim();
}

function normalizeLower(value?: string | number | boolean | null) {
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

function toSafeOrder(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 999999;
}

function isActiveStatus(value: unknown) {
  const status = normalizeLower(value);

  return status === "" || status === "published" || status === "active";
}

function getVariantProductSlug(variant: CatalogVariant) {
  return normalizeLower((variant as any).product_slug);
}

function buildVariantTitle(variant: CatalogVariant | null) {
  if (!variant) return "";

  const directTitle = normalize((variant as any).title || (variant as any).name);

  if (!directTitle) return "";

  const lowered = directTitle.toLowerCase();

  if (
    lowered === "default" ||
    lowered === "default title" ||
    lowered === "default variant"
  ) {
    return "";
  }

  return directTitle;
}

function getProductBoxQuantity(product: CatalogProduct) {
  return toPositiveInteger((product as any).box_quantity, 0) || 1;
}

function getVariantImage(variant: CatalogVariant | null) {
  if (!variant) return "";

  return (
    normalize((variant as any).variant_image_url) ||
    normalize((variant as any).variant_image) ||
    normalize((variant as any).variant_image_file_id) ||
    normalize((variant as any).variant_image_legacy_id) ||
    normalize((variant as any).image_id)
  );
}

function getProductImage(product: CatalogProduct) {
  return (
    normalize((product as any).image_url) ||
    normalize((product as any).image) ||
    ""
  );
}

function getProductPrice(product: CatalogProduct) {
  return toNumber((product as any).price ?? "0");
}

function getProductCompareAtPrice(product: CatalogProduct) {
  return toNumber((product as any).compare_at_price ?? "0");
}

function getProductSku(product: CatalogProduct) {
  return normalize((product as any).sku);
}

function getBackendVariant(options: {
  allVariants: CatalogVariant[];
  variantsBySlug: Map<string, CatalogVariant[]>;
  product: CatalogProduct;
  productSlug: string;
}) {
  const { allVariants, variantsBySlug, product, productSlug } = options;

  const productId = normalize((product as any).id);
  const normalizedProductSlug = normalizeLower(productSlug);

  const fromMap = variantsBySlug.get(normalizedProductSlug) || [];

  const scoped = fromMap.length
    ? fromMap
    : allVariants.filter((variant) => {
        const variantProductId = normalize((variant as any).product_id);
        const variantSlug = getVariantProductSlug(variant);

        return (
          (productId && variantProductId === productId) ||
          variantSlug === normalizedProductSlug
        );
      });

  const active = scoped
    .filter((variant) => isActiveStatus((variant as any).status))
    .sort((a, b) => toSafeOrder((a as any).sort_order) - toSafeOrder((b as any).sort_order));

  return active[0] || scoped[0] || null;
}

export async function resolveCartCatalogItem(
  productSlug: string,
  _variantId?: string
): Promise<ResolvedCartCatalogItem> {
  const normalizedProductSlug = normalizeLower(productSlug);

  if (!normalizedProductSlug) {
    throw new Error("product_slug is required.");
  }

  const { products, allVariants, variantsBySlug } = await getCatalogBundle();

  const product =
    products.find(
      (item) =>
        normalizeLower((item as any).slug) === normalizedProductSlug &&
        normalizeLower((item as any).status) === "published"
    ) || null;

  if (!product) {
    throw new Error("Product not found.");
  }

  const backendVariant = getBackendVariant({
    allVariants,
    variantsBySlug,
    product,
    productSlug: normalizedProductSlug,
  });

  const productPrice = getProductPrice(product);
  const variantPrice = toNumber((backendVariant as any)?.price ?? "0");

  const productCompareAtPrice = getProductCompareAtPrice(product);
  const variantCompareAtPrice = toNumber(
    (backendVariant as any)?.compare_at_price ?? "0"
  );

  const unitPrice = productPrice || variantPrice;
  const compareAtPrice = productCompareAtPrice || variantCompareAtPrice;

  const sku = getProductSku(product) || normalize((backendVariant as any)?.sku);
  const image = getProductImage(product) || getVariantImage(backendVariant);
  const boxQuantity = getProductBoxQuantity(product);

  return {
    product,
    variant: backendVariant,
    variantId:
      normalize((backendVariant as any)?.id) ||
      normalize((product as any).id) ||
      normalizedProductSlug,
    productTitle: normalize((product as any).title) || "Product",
    variantTitle: buildVariantTitle(backendVariant),
    sku,
    image,
    unitPrice,
    compareAtPrice,
    boxQuantity,
  };
}