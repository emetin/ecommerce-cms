"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, useState } from "react";
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

const ProductGallery = dynamic(() => import("./ProductGallery"), {
  loading: () => (
    <div
      style={{
        width: "100%",
        minHeight: 560,
        borderRadius: 24,
        border: "1px solid #e7ddcf",
        background: "#f8f4ed",
      }}
    />
  ),
});

const ProductPurchasePanel = dynamic(() => import("./ProductPurchasePanel"), {
  loading: () => (
    <div
      style={{
        width: "100%",
        minHeight: 220,
        borderRadius: 24,
        border: "1px solid #e7ddcf",
        background: "#fffaf4",
      }}
    />
  ),
});

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

function formatTags(value?: string) {
  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function ProductDetailClientComponent({
  product,
  relatedProducts,
  variants,
  productImages,
  allProductImages,
}: ProductDetailClientProps) {
  const [selectedVariant, setSelectedVariant] = useState<VariantItem | null>(
    null
  );
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
      String(
        selectedVariant?.variant_image || selectedVariant?.image_id || ""
      ).trim()
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
  const productTags = formatTags(product.tags);

  const relatedPrimaryImageMap = useMemo(() => {
    const imagesBySlug = new Map<string, ProductImageItem[]>();

    for (const image of allProductImages) {
      const slug = normalizeLower(image.product_slug);
      if (!slug) continue;

      const current = imagesBySlug.get(slug);
      if (current) {
        current.push(image);
      } else {
        imagesBySlug.set(slug, [image]);
      }
    }

    for (const [slug, items] of imagesBySlug.entries()) {
      imagesBySlug.set(slug, sortProductImages(items));
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
            className="product-detail-grid"
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
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={mainBadgeStyle}>{collectionLabel}</div>

                  {product.vendor ? (
                    <div style={secondaryBadgeStyle}>{product.vendor}</div>
                  ) : null}

                  {product.product_category ? (
                    <div style={secondaryBadgeStyle}>
                      {product.product_category}
                    </div>
                  ) : null}

                  {product.type ? (
                    <div style={secondaryBadgeStyle}>{product.type}</div>
                  ) : null}
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
                    color: "#5d554a",
                    fontSize: 16,
                    lineHeight: 1.9,
                    maxWidth: 760,
                  }}
                >
                  {product.short_description ||
                    product.description ||
                    "Explore this product for hospitality and project-based sourcing."}
                </p>

                {(product.vendor ||
                  product.product_category ||
                  product.type ||
                  productTags.length > 0) ? (
                  <div style={metaPanelStyle}>
                    <MetaRow label="Vendor" value={product.vendor || "-"} />
                    <MetaRow
                      label="Product Category"
                      value={product.product_category || "-"}
                    />
                    <MetaRow label="Type" value={product.type || "-"} />
                    <MetaRow
                      label="Tags"
                      value={productTags.length ? productTags.join(", ") : "-"}
                    />
                  </div>
                ) : null}
              </div>

              <ProductPurchasePanel
                product={{
                  title: product.title,
                  slug: product.slug,
                  image: primaryImage || product.image,
                }}
                variants={variants}
                onVariantChange={setSelectedVariant}
              />
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="soft">
        <Container>
          <div
            className="product-support-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: 24,
              alignItems: "start",
            }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5ddd2",
                borderRadius: 24,
                padding: 24,
              }}
            >
              <SectionHeading
                kicker="Product Overview"
                title="Designed for wholesale review and project discussion"
                text="This product page supports B2B evaluation through category context, variant structure, and a more organized media presentation."
              />

              <div
                style={{
                  color: "#5d554a",
                  lineHeight: 1.9,
                  fontSize: 15,
                }}
              >
                {product.description ||
                  product.short_description ||
                  "No detailed product description has been added yet."}
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #e5ddd2",
                borderRadius: 24,
                padding: 24,
              }}
            >
              <SectionHeading
                kicker="Need Project Support?"
                title="Share your category or quantity requirements"
                text="If you are reviewing this product for a hotel, resort, residence, or contract project, send a detailed inquiry for faster direction."
              />

              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                <ButtonLink href="/contact-us">Request Information</ButtonLink>
                <ButtonLink href="/collections" variant="secondary">
                  Explore More Collections
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {relatedProducts.length > 0 ? (
        <Section>
          <Container>
            <SectionHeading
              kicker="Related Products"
              title="Continue reviewing related products"
              text="Explore more products within the same collection structure."
            />

            <div className="cards-grid cards-grid--3">
              {relatedProducts.map((item, index) => {
                const relatedImage =
                  relatedPrimaryImageMap.get(normalizeLower(item.slug)) ||
                  item.image ||
                  "";

                return (
                  <ProductCard
                    key={item.slug || `${item.title}-${index}`}
                    title={item.title || "Product"}
                    description={
                      item.short_description ||
                      item.description ||
                      "Explore this product."
                    }
                    image={relatedImage}
                    href={`/products/${item.slug || ""}`}
                    collectionLabel={formatCollectionLabel(item.collection_slug)}
                    vendor={item.vendor || ""}
                    productCategory={item.product_category || item.type || ""}
                    prefetch={false}
                  />
                );
              })}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        paddingBottom: 10,
        borderBottom: "1px solid #eee5d9",
      }}
    >
      <span style={{ color: "#7b7367", fontWeight: 700 }}>{label}</span>
      <span style={{ fontWeight: 800, textAlign: "right", color: "#171717" }}>
        {value}
      </span>
    </div>
  );
}

const mainBadgeStyle: React.CSSProperties = {
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
};

const secondaryBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 32,
  width: "fit-content",
  padding: "0 12px",
  borderRadius: 999,
  background: "#faf7f1",
  color: "#6b6256",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const metaPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 18,
  borderRadius: 20,
  border: "1px solid #e8dfd2",
  background: "#fffaf4",
};

export default memo(ProductDetailClientComponent);