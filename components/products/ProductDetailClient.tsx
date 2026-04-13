"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Container from "../ui/Container";
import Section from "../ui/Section";
import SectionHeading from "../ui/SectionHeading";
import ButtonLink from "../ui/ButtonLink";
import ProductCard from "../cards/ProductCard";
import type { VariantItem } from "./ProductPurchasePanel";
import {
  areSameImageUrls,
  normalizeImageUrl,
  uniqueImageUrls,
} from "../../lib/image-url";

const ProductGallery = dynamic(() => import("./ProductGallery"));
const ProductPurchasePanel = dynamic(() => import("./ProductPurchasePanel"));

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

function formatCollectionLabel(value?: string) {
  const raw = normalizeText(value);
  if (!raw) return "Product";

  return raw
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function parseLegacyGallery(value?: string) {
  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildOrderedGallery(
  product: ProductItem,
  variants: VariantItem[],
  productImages: ProductImageItem[]
) {
  const primaryImage = getPrimaryProductImage(product, productImages);

  const imageManagerUrls = sortProductImages(productImages)
    .map((item) => normalizeImageUrl(item.image_url || ""))
    .filter(Boolean);

  const legacyGalleryUrls = parseLegacyGallery(product.gallery).map((item) =>
    normalizeImageUrl(item)
  );

  const variantUrls = variants
    .map((variant) =>
      normalizeImageUrl(variant.variant_image || variant.image_id || "")
    )
    .filter(Boolean);

  return uniqueImageUrls([
    primaryImage,
    ...imageManagerUrls,
    ...legacyGalleryUrls,
    ...variantUrls,
  ]);
}

type ProductDetailClientProps = {
  product: ProductItem;
  relatedProducts: ProductItem[];
  variants: VariantItem[];
  productImages: ProductImageItem[];
  allProductImages: ProductImageItem[];
};

export default function ProductDetailClient({
  product,
  relatedProducts,
  variants,
  productImages,
  allProductImages,
}: ProductDetailClientProps) {
  const [selectedVariant, setSelectedVariant] = useState<VariantItem | null>(null);
  const [selectedImage, setSelectedImage] = useState("");

  const baseGalleryImages = useMemo(
    () => buildOrderedGallery(product, variants, productImages),
    [product, variants, productImages]
  );

  const primaryImage = useMemo(
    () => getPrimaryProductImage(product, productImages),
    [product, productImages]
  );

  const selectedVariantImage = useMemo(() => {
    return normalizeImageUrl(
      String(selectedVariant?.variant_image || selectedVariant?.image_id || "").trim()
    );
  }, [selectedVariant]);

  const galleryImages = useMemo(() => {
    if (!selectedVariantImage) {
      return baseGalleryImages;
    }

    const existsInGallery = baseGalleryImages.some((item) =>
      areSameImageUrls(item, selectedVariantImage)
    );

    if (existsInGallery) {
      return baseGalleryImages;
    }

    return uniqueImageUrls([selectedVariantImage, ...baseGalleryImages]);
  }, [baseGalleryImages, selectedVariantImage]);

  const controlledActiveImage = useMemo(() => {
    if (selectedVariantImage) {
      return selectedVariantImage;
    }

    if (selectedImage) {
      return selectedImage;
    }

    return primaryImage;
  }, [primaryImage, selectedImage, selectedVariantImage]);

  const collectionLabel = formatCollectionLabel(product.collection_slug);

  const relatedPrimaryImageMap = useMemo(() => {
    const imagesBySlug = new Map<string, ProductImageItem[]>();

    for (const image of allProductImages) {
      const slug = normalizeLower(image.product_slug);
      if (!slug) continue;

      const current = imagesBySlug.get(slug) || [];
      current.push(image);
      imagesBySlug.set(slug, current);
    }

    const result = new Map<string, string>();

    for (const item of relatedProducts) {
      const slug = normalizeLower(item.slug);
      const relatedImages = imagesBySlug.get(slug) || [];
      result.set(slug, getPrimaryProductImage(item, relatedImages));
    }

    return result;
  }, [allProductImages, relatedProducts]);

  return (
    <>
      <Section>
        <Container>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <ButtonLink href="/products" variant="secondary">
              ← Back to Products
            </ButtonLink>

            <div
              style={{
                color: "#7b7367",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Home / Products / {product.title || "Product"}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.05fr 0.95fr",
              gap: 42,
              alignItems: "start",
            }}
          >
            <ProductGallery
              title={product.title || "Product"}
              images={galleryImages}
              controlledActiveImage={controlledActiveImage || undefined}
              onActiveImageChange={setSelectedImage}
            />

            <div
              style={{
                display: "grid",
                gap: 22,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 32,
                    width: "fit-content",
                    padding: "0 12px",
                    borderRadius: 999,
                    background: "#f3ede3",
                    color: "#2f7d62",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {collectionLabel}
                </div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(2rem, 3.2vw, 3.4rem)",
                    lineHeight: 1.04,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: "#171717",
                  }}
                >
                  {product.title || "Untitled Product"}
                </h1>

                <p
                  style={{
                    margin: 0,
                    color: "#