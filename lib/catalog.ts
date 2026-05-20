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
  minQuantity: number;
  boxQuantity: number;
  caseQuantity: number;
  stepQuantity: number;
};

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalize(value).toLowerCase();
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(String(value ?? "").trim());

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
}

function toSafeOrder(value: unknown) {
  const parsed = Number(String(value ?? "").trim());

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

function getProductMinQuantity(product: CatalogProduct) {
  return (
    toPositiveInteger((product as any).min_quantity, 0) ||
    toPositiveInteger((product as any).minimum_quantity, 0) ||
    1
  );
}

function getProductBoxQuantity(product: CatalogProduct) {
  return (
    toPositiveInteger((product as any).box_quantity, 0) ||
    toPositiveInteger((product as any).case_quantity, 0) ||
    1
  );
}

function getProductCaseQuantity(product: CatalogProduct) {
  return (
    toPositiveInteger((product as any).case_quantity, 0) ||
    toPositiveInteger((product as any).box_quantity, 0) ||
    0
  );
}

function getVariantBoxQuantity(variant: CatalogVariant | null) {
  if (!variant) return 0;

  return (
    toPositiveInteger((variant as any).box_quantity, 0) ||
    toPositiveInteger((variant as any).case_quantity, 0) ||
    0
  );
}

function getVariantCaseQuantity(variant: CatalogVariant | null) {
  if (!variant) return 0;

  return (
    toPositiveInteger((variant as any).case_quantity, 0) ||
    toPositiveInteger((variant as any).box_quantity, 0) ||
    0
  );
}

function getVariantMinQuantity(variant: CatalogVariant | null) {
  if (!variant) return 0;

  return (
    toPositiveInteger((variant as any).min_quantity, 0) ||
    toPositiveInteger((variant as any).minimum_quantity, 0) ||
    0
  );
}

function resolveQuantityRules(product: CatalogProduct, variant: CatalogVariant | null) {
  const minQuantity =
    getVariantMinQuantity(variant) || getProductMinQuantity(product) || 1;

  const boxQuantity =
    getVariantBoxQuantity(variant) ||
    getProductBoxQuantity(product) ||
    minQuantity ||
    1;

  const caseQuantity =
    getVariantCaseQuantity(variant) || getProductCaseQuantity(product) || 0;

  const stepQuantity =
    toPositiveInteger((variant as any)?.step_quantity, 0) ||
    toPositiveInteger((product as any).step_quantity, 0) ||
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

function variantMatchesId(variant: CatalogVariant, variantId: string) {
  const normalizedVariantId = normalizeLower(variantId);

  if (!normalizedVariantId) {
    return false;
  }

  return (
    normalizeLower((variant as any).id) === normalizedVariantId ||
    normalizeLower((variant as any).variant_id) === normalizedVariantId ||
    normalizeLower((variant as any).sku) === normalizedVariantId ||
    normalizeLower((variant as any).title) === normalizedVariantId ||
    normalizeLower((variant as any).name) === normalizedVariantId ||
    normalizeLower((variant as any).option1_value) === normalizedVariantId ||
    normalizeLower((variant as any).option2_value) === normalizedVariantId ||
    normalizeLower((variant as any).option3_value) === normalizedVariantId
  );
}

function getBackendVariant(options: {
  allVariants: CatalogVariant[];
  variantsBySlug: Map<string, CatalogVariant[]>;
  product: CatalogProduct;
  productSlug: string;
  variantId?: string;
}) {
  const { allVariants, variantsBySlug, product, productSlug, variantId } =
    options;

  const productId = normalize((product as any).id);
  const normalizedProductSlug = normalizeLower(productSlug);
  const normalizedVariantId = normalizeLower(variantId);

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
    .sort((a, b) => {
      return (
        toSafeOrder((a as any).sort_order) -
        toSafeOrder((b as any).sort_order)
      );
    });

  const candidates = active.length ? active : scoped;

  if (normalizedVariantId) {
    const exactVariant = candidates.find((variant) =>
      variantMatchesId(variant, normalizedVariantId)
    );

    if (exactVariant) {
      return exactVariant;
    }
  }

  return candidates[0] || null;
}

export async function resolveCartCatalogItem(
  productSlug: string,
  variantId?: string
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
    variantId,
  });

  const productPrice = getProductPrice(product);
  const variantPrice = toNumber((backendVariant as any)?.price ?? "0");

  const productCompareAtPrice = getProductCompareAtPrice(product);
  const variantCompareAtPrice = toNumber(
    (backendVariant as any)?.compare_at_price ?? "0"
  );

  const unitPrice = variantPrice || productPrice;
  const compareAtPrice = variantCompareAtPrice || productCompareAtPrice;

  const sku = normalize((backendVariant as any)?.sku) || getProductSku(product);
  const image = getVariantImage(backendVariant) || getProductImage(product);

  const quantityRules = resolveQuantityRules(product, backendVariant);

  return {
    product,
    variant: backendVariant,
    variantId:
      normalize((backendVariant as any)?.id) ||
      normalize((backendVariant as any)?.variant_id) ||
      normalize((product as any).id) ||
      normalizedProductSlug,
    productTitle: normalize((product as any).title) || "Product",
    variantTitle: buildVariantTitle(backendVariant),
    sku,
    image,
    unitPrice,
    compareAtPrice,
    minQuantity: quantityRules.minQuantity,
    boxQuantity: quantityRules.boxQuantity,
    caseQuantity: quantityRules.caseQuantity,
    stepQuantity: quantityRules.stepQuantity,
  };
}