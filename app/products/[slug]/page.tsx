import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  findSheetItemByField,
  findSheetItemsByField,
  getSheetData,
} from "../../../lib/sheets";
import { buildPageMetadata } from "../../../lib/seo";
import { normalizeImageUrl } from "../../../lib/image-url";
import ProductDetailClient from "../../../components/products/ProductDetailClient";
import type { VariantItem } from "../../../components/products/ProductPurchasePanel";

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

const getPublishedProductBySlug = cache(async (slug: string) => {
  const product = await findSheetItemByField<ProductItem>("products", "slug", slug);

  if (!product) {
    return null;
  }

  if (normalizeLower(product.status) !== "published") {
    return null;
  }

  return product;
});

const getProductPageData = cache(async (slug: string) => {
  const product = await getPublishedProductBySlug(slug);

  if (!product) {
    return {
      product: null,
      relatedProducts: [] as ProductItem[],
      variants: [] as VariantItem[],
      productImages: [] as ProductImageItem[],
      allProductImages: [] as ProductImageItem[],
    };
  }

  const [variantsData, productImages, allProducts] = await Promise.all([
    findSheetItemsByField<VariantItem>("product_variants", "product_slug", slug),
    findSheetItemsByField<ProductImageItem>("product_images", "product_slug", slug),
    getSheetData("products"),
  ]);

  const filteredVariants = variantsData.filter((variant) => {
    const variantStatus = normalizeLower(variant.status);
    return ["", "published", "active"].includes(variantStatus);
  });

  const publishedProducts = (allProducts as ProductItem[]).filter(
    (item) => normalizeLower(item.status) === "published"
  );

  const currentCollectionSlug = normalizeLower(product.collection_slug);

  const relatedProducts = publishedProducts
    .filter((item) => {
      const itemSlug = normalizeLower(item.slug);
      const itemCollectionSlug = normalizeLower(item.collection_slug);

      return (
        itemSlug !== slug &&
        itemCollectionSlug === currentCollectionSlug
      );
    })
    .slice(0, 3);

  return {
    product,
    relatedProducts,
    variants: filteredVariants,
    productImages,
    allProductImages: productImages,
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
      description: "Explore hospitality textile products by Patak Textile.",
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

  try {
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
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred.";

    return (
      <div style={{ padding: 40 }}>
        <strong>Error:</strong> {errorMessage}
      </div>
    );
  }
}