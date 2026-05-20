import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { normalizeImageUrl } from "../../../lib/image-url";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import ProductDetailClient from "../../../components/products/ProductDetailClient";
import type { VariantItem } from "../../../components/products/ProductPurchasePanel";

export const revalidate = 1800;

type ProductItem = {
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

  sku?: string;
  price?: string | number;
  compare_at_price?: string | number;
  box_quantity?: string | number;
  case_quantity?: string | number;
  min_quantity?: string | number;
  minimum_quantity?: string | number;
  step_quantity?: string | number;
};

type ProductImageItem = {
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

type ProductRow = Record<string, any>;
type ProductImageRow = Record<string, any>;
type VariantRow = Record<string, any>;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toSafeOrder(value: unknown) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : 999999;
}

function isTrue(value: unknown) {
  const normalized = normalizeLower(value);
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function isActiveStatus(value: unknown) {
  const status = normalizeLower(value);
  return status === "" || status === "published" || status === "active";
}

function isPublishedProduct(value: unknown) {
  return normalizeLower(value) === "published";
}

function isBrokenImageValue(value: unknown) {
  const raw = normalizeText(value);

  if (!raw) return true;
  if (raw.startsWith("img_")) return true;

  return false;
}

function safeImageUrl(...values: unknown[]) {
  for (const value of values) {
    const raw = normalizeText(value);

    if (isBrokenImageValue(raw)) {
      continue;
    }

    const normalized = normalizeImageUrl(raw);

    if (normalized && !isBrokenImageValue(normalized)) {
      return normalized;
    }
  }

  return "";
}

function sortProductImages(images: ProductImageItem[]) {
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

function sortVariants(variants: VariantItem[]) {
  return [...variants].sort((a, b) => {
    const byOrder = toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
    if (byOrder !== 0) return byOrder;

    return normalizeText(a.id).localeCompare(normalizeText(b.id));
  });
}

function getPrimaryProductImage(
  product: ProductItem,
  productImages: ProductImageItem[]
) {
  const sortedImages = sortProductImages(productImages);
  const mainImage = sortedImages.find((item) => isTrue(item.is_main));
  const firstGalleryImage = sortedImages[0];

  return safeImageUrl(
    mainImage?.image_url,
    firstGalleryImage?.image_url,
    product.image
  );
}

function mapProduct(row: ProductRow): ProductItem {
  const productImage = safeImageUrl(
    row.image_url,
    row.image,
    row.image_file_id
  );

  return {
    id: normalizeText(row.id),
    title: normalizeText(row.title),
    slug: normalizeText(row.slug),
    description: normalizeText(row.description),
    short_description: normalizeText(row.short_description),
    image: productImage,
    gallery: normalizeText(row.gallery),
    collection_slug: normalizeText(row.collection_slug),
    status: normalizeText(row.status),
    featured: isTrue(row.featured) ? "true" : "false",
    created_at: normalizeText(row.created_at),
    updated_at: normalizeText(row.updated_at),
    seo_title: normalizeText(row.seo_title),
    seo_description: normalizeText(row.seo_description),
    vendor: normalizeText(row.vendor),
    product_category: normalizeText(row.product_category),
    type: normalizeText(row.product_type || row.type),
    tags: normalizeText(row.tags),

    sku: normalizeText(row.sku),
    price: row.base_price ?? row.price ?? "",
    compare_at_price: row.compare_at_price ?? "",
    box_quantity: row.box_quantity ?? "",
    case_quantity: row.case_quantity ?? "",
    min_quantity: row.min_quantity ?? row.min_order_quantity ?? "",
    minimum_quantity: row.minimum_quantity ?? row.min_order_quantity ?? "",
    step_quantity: row.step_quantity ?? row.quantity_step ?? "",
  };
}

function mapImage(row: ProductImageRow): ProductImageItem {
  const joinedProduct = row.products || {};

  return {
    id: normalizeText(row.id),
    product_slug: normalizeText(row.product_slug || joinedProduct.slug),
    image_url: safeImageUrl(row.image_url, row.image_file_id),
    image_file_id: normalizeText(row.image_file_id),
    image_uploaded_at: normalizeText(row.image_uploaded_at),
    sort_order: normalizeText(row.sort_order),
    alt_text: normalizeText(row.alt_text),
    is_main: isTrue(row.is_main) ? "true" : "false",
    created_at: normalizeText(row.created_at),
    updated_at: normalizeText(row.updated_at),
  };
}

function mapVariant(row: VariantRow, productSlug: string): VariantItem {
  const joinedProduct = row.products || {};
  const resolvedProductSlug =
    normalizeText(row.product_slug) ||
    normalizeText(joinedProduct.slug) ||
    productSlug;

  return {
    id: normalizeText(row.id),
    product_slug: resolvedProductSlug,
    product_id: normalizeText(row.product_id),
    title: normalizeText(row.title),
    name: normalizeText(row.name),

    option1_name: normalizeText(row.option1_name),
    option1_value: normalizeText(row.option1_value),
    option2_name: normalizeText(row.option2_name),
    option2_value: normalizeText(row.option2_value),
    option3_name: normalizeText(row.option3_name),
    option3_value: normalizeText(row.option3_value),

    sku: normalizeText(row.sku),
    barcode: normalizeText(row.barcode),
    price: row.price ?? "",
    compare_at_price: row.compare_at_price ?? "",
    status: normalizeText(row.status),

    variant_image: safeImageUrl(
      row.variant_image,
      row.variant_image_url,
      row.variant_image_file_id,
      row.variant_image_legacy_id,
      row.image_id
    ),
    variant_image_url: safeImageUrl(row.variant_image_url, row.variant_image),
    image_id: normalizeText(row.image_id),
    variant_image_file_id: normalizeText(row.variant_image_file_id),
    variant_image_legacy_id: normalizeText(row.variant_image_legacy_id),

    box_quantity: row.box_quantity ?? "",
    case_quantity: row.case_quantity ?? "",
    min_quantity: row.min_quantity ?? row.min_order_quantity ?? "",
    minimum_quantity: row.minimum_quantity ?? row.min_order_quantity ?? "",
    step_quantity: row.step_quantity ?? row.quantity_step ?? "",

    sort_order: row.sort_order ?? "",
    created_at: normalizeText(row.created_at),
    updated_at: normalizeText(row.updated_at),
  };
}

async function fetchProduct(slug: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load product: ${error.message}`);
  }

  return data as ProductRow | null;
}

async function fetchProductImages(productId: string) {
  if (!productId) {
    return [] as ProductImageItem[];
  }

  const supabase = createSupabaseAdminClient();

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
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load product images: ${error.message}`);
  }

  return ((data || []) as ProductImageRow[])
    .map(mapImage)
    .filter((image) => Boolean(image.image_url));
}

async function fetchProductVariants(productId: string, productSlug: string) {
  if (!productId) {
    return [] as VariantItem[];
  }

  const supabase = createSupabaseAdminClient();

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
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load product variants: ${error.message}`);
  }

  return sortVariants(
    ((data || []) as VariantRow[])
      .map((variant) => mapVariant(variant, productSlug))
      .filter((variant) => isActiveStatus(variant.status))
  );
}

async function fetchRelatedProducts(product: ProductItem) {
  const collectionSlug = normalizeText(product.collection_slug);
  const currentProductId = normalizeText(product.id);

  if (!collectionSlug) {
    return [] as ProductItem[];
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "published")
    .eq("collection_slug", collectionSlug)
    .neq("id", currentProductId)
    .order("title", { ascending: true })
    .limit(3);

  if (error) {
    return [] as ProductItem[];
  }

  return ((data || []) as ProductRow[])
    .map(mapProduct)
    .filter((item) => isPublishedProduct(item.status));
}

async function fetchImagesForRelatedProducts(products: ProductItem[]) {
  const productIds = products
    .map((product) => normalizeText(product.id))
    .filter(Boolean);

  if (!productIds.length) {
    return [] as ProductImageItem[];
  }

  const supabase = createSupabaseAdminClient();

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
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });

  if (error) {
    return [] as ProductImageItem[];
  }

  return ((data || []) as ProductImageRow[])
    .map(mapImage)
    .filter((image) => Boolean(image.image_url));
}

const getProductPageData = cache(async (slug: string) => {
  const normalizedSlug = normalizeLower(slug);
  const rawProduct = await fetchProduct(normalizedSlug);

  if (!rawProduct) {
    return {
      product: null,
      relatedProducts: [] as ProductItem[],
      variants: [] as VariantItem[],
      productImages: [] as ProductImageItem[],
      allProductImages: [] as ProductImageItem[],
    };
  }

  const product = mapProduct(rawProduct);
  const productId = normalizeText(product.id);
  const productSlug = normalizeText(product.slug);

  const [productImages, variants, relatedProducts] = await Promise.all([
    fetchProductImages(productId),
    fetchProductVariants(productId, productSlug),
    fetchRelatedProducts(product),
  ]);

  const relatedProductImages = await fetchImagesForRelatedProducts(
    relatedProducts
  );

  return {
    product,
    relatedProducts,
    variants,
    productImages: sortProductImages(productImages),
    allProductImages: relatedProductImages,
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();

  try {
    const { product, productImages } = await getProductPageData(decodedSlug);

    if (!product) {
      return buildPageMetadata({
        title: "Product Not Found",
        description: "The requested product could not be found.",
        path: `/products/${decodedSlug}`,
      });
    }

    const primaryImage = getPrimaryProductImage(product, productImages);

    return buildPageMetadata({
      title: product.seo_title || product.title || "Product",
      description:
        product.seo_description ||
        product.short_description ||
        product.description ||
        "Explore this hospitality textile product.",
      image: primaryImage,
      path: `/products/${decodedSlug}`,
    });
  } catch {
    return buildPageMetadata({
      title: "Products",
      description: "Explore hospitality textile products.",
      path: `/products/${decodedSlug}`,
    });
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();

  const {
    product,
    relatedProducts,
    variants,
    productImages,
    allProductImages,
  } = await getProductPageData(decodedSlug);

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailClient
      product={product}
      relatedProducts={relatedProducts}
      variants={variants}
      productImages={productImages}
      allProductImages={allProductImages}
    />
  );
}