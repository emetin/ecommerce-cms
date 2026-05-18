import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSheetData } from "../../../lib/sheets";
import { buildPageMetadata } from "../../../lib/seo";
import { normalizeImageUrl } from "../../../lib/image-url";
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

function getPrimaryProductImage(
  product: ProductItem,
  productImages: ProductImageItem[]
) {
  const sortedImages = sortProductImages(productImages);
  const mainImage = sortedImages.find((item) => isTrue(item.is_main));
  const firstGalleryImage = sortedImages[0];

  return normalizeImageUrl(
    mainImage?.image_url || firstGalleryImage?.image_url || product.image || ""
  );
}

function filterPublishedProducts(products: ProductItem[]) {
  return products.filter(
    (item) =>
      normalizeLower(item.status) === "published" &&
      Boolean(normalizeLower(item.slug))
  );
}

function filterActiveVariants(variants: VariantItem[]) {
  return variants.filter((variant) => {
    const variantStatus = normalizeLower(variant.status);
    return ["", "published", "active"].includes(variantStatus);
  });
}

function groupImagesBySlug(images: ProductImageItem[]) {
  const map = new Map<string, ProductImageItem[]>();

  for (const image of images) {
    const slug = normalizeLower(image.product_slug);
    if (!slug) continue;

    const current = map.get(slug);
    if (current) {
      current.push(image);
    } else {
      map.set(slug, [image]);
    }
  }

  for (const [slug, items] of map.entries()) {
    map.set(slug, sortProductImages(items));
  }

  return map;
}

function groupVariantsBySlug(variants: VariantItem[]) {
  const map = new Map<string, VariantItem[]>();

  for (const variant of variants) {
    const slug = normalizeLower(variant.product_slug);
    if (!slug) continue;

    const status = normalizeLower(variant.status);
    if (!["", "published", "active"].includes(status)) continue;

    const current = map.get(slug);
    if (current) {
      current.push(variant);
    } else {
      map.set(slug, [variant]);
    }
  }

  return map;
}

const getCatalogData = cache(async () => {
  const [allProductsRaw, allProductImagesRaw, allVariantsRaw] =
    await Promise.all([
      getSheetData("products", { ttlSeconds: 1800 }),
      getSheetData("product_images", { ttlSeconds: 1800 }),
      getSheetData("product_variants", { ttlSeconds: 1800 }),
    ]);

  const allProducts = allProductsRaw as ProductItem[];
  const allProductImages = allProductImagesRaw as ProductImageItem[];
  const allVariants = allVariantsRaw as VariantItem[];

  const publishedProducts = filterPublishedProducts(allProducts);
  const imagesBySlug = groupImagesBySlug(allProductImages);
  const variantsBySlug = groupVariantsBySlug(filterActiveVariants(allVariants));

  return {
    allProducts,
    publishedProducts,
    allProductImages,
    allVariants,
    imagesBySlug,
    variantsBySlug,
  };
});

const getPublishedProductBySlug = cache(async (slug: string) => {
  const normalizedSlug = normalizeLower(slug);
  const { publishedProducts } = await getCatalogData();

  return (
    publishedProducts.find(
      (product) => normalizeLower(product.slug) === normalizedSlug
    ) || null
  );
});

const getProductPageData = cache(async (slug: string) => {
  const normalizedSlug = normalizeLower(slug);
  const product = await getPublishedProductBySlug(normalizedSlug);

  if (!product) {
    return {
      product: null,
      relatedProducts: [] as ProductItem[],
      variants: [] as VariantItem[],
      productImages: [] as ProductImageItem[],
      allProductImages: [] as ProductImageItem[],
    };
  }

  const { publishedProducts, allProductImages, imagesBySlug, variantsBySlug } =
    await getCatalogData();

  const currentProductImages = imagesBySlug.get(normalizedSlug) || [];
  const filteredVariants = variantsBySlug.get(normalizedSlug) || [];

  const currentCollectionSlug = normalizeLower(product.collection_slug);

  const relatedProducts = publishedProducts
    .filter((item) => {
      const itemSlug = normalizeLower(item.slug);
      const itemCollectionSlug = normalizeLower(item.collection_slug);

      return (
        itemSlug !== normalizedSlug &&
        itemCollectionSlug === currentCollectionSlug
      );
    })
    .slice(0, 3);

  return {
    product,
    relatedProducts,
    variants: filteredVariants,
    productImages: currentProductImages,
    allProductImages,
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