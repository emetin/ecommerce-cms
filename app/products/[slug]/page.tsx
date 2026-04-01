import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSheetData } from "../../../lib/sheets";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();

  try {
    const [items, imageData] = await Promise.all([
      getSheetData("products"),
      getSheetData("product_images"),
    ]);

    const products = items as ProductItem[];
    const allProductImages = imageData as ProductImageItem[];

    const product =
      products.find(
        (item) =>
          normalizeLower(item.slug) === decodedSlug &&
          normalizeLower(item.status) === "published"
      ) || null;

    if (!product) {
      return buildPageMetadata({
        title: "Product Not Found",
        description: "The requested product could not be found.",
        path: `/products/${decodedSlug}`,
      });
    }

    const productImages = allProductImages.filter(
      (item) => normalizeLower(item.product_slug) === decodedSlug
    );

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

  let product: ProductItem | null = null;
  let relatedProducts: ProductItem[] = [];
  let variants: VariantItem[] = [];
  let productImages: ProductImageItem[] = [];
  let allProductImages: ProductImageItem[] = [];
  let errorMessage = "";

  try {
    const [productData, variantData, imageData] = await Promise.all([
      getSheetData("products"),
      getSheetData("product_variants"),
      getSheetData("product_images"),
    ]);

    const items = productData as ProductItem[];
    const allVariants = variantData as VariantItem[];
    allProductImages = imageData as ProductImageItem[];

    const foundProduct =
      items.find(
        (item) =>
          normalizeLower(item.slug) === decodedSlug &&
          normalizeLower(item.status) === "published"
      ) || null;

    product = foundProduct;

    if (foundProduct) {
      const currentCollectionSlug = normalizeLower(foundProduct.collection_slug);

      variants = allVariants.filter((variant) => {
        const variantSlug = normalizeLower(variant.product_slug);
        const variantStatus = normalizeLower(variant.status);

        return (
          variantSlug === decodedSlug &&
          ["", "published", "active"].includes(variantStatus)
        );
      });

      productImages = allProductImages.filter(
        (item) => normalizeLower(item.product_slug) === decodedSlug
      );

      relatedProducts = items
        .filter((item) => {
          const itemSlug = normalizeLower(item.slug);
          const itemStatus = normalizeLower(item.status);
          const itemCollectionSlug = normalizeLower(item.collection_slug);

          return (
            itemSlug !== decodedSlug &&
            itemStatus === "published" &&
            itemCollectionSlug === currentCollectionSlug
          );
        })
        .slice(0, 3);
    }
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred.";
  }

  if (errorMessage) {
    return (
      <div style={{ padding: 40 }}>
        <strong>Error:</strong> {errorMessage}
      </div>
    );
  }

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