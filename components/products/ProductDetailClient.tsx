"use client";

import { useMemo, useState } from "react";
import Container from "../ui/Container";
import Section from "../ui/Section";
import SectionHeading from "../ui/SectionHeading";
import ButtonLink from "../ui/ButtonLink";
import ProductCard from "../cards/ProductCard";
import ProductGallery from "./ProductGallery";
import ProductPurchasePanel, { VariantItem } from "./ProductPurchasePanel";
import {
  areSameImageUrls,
  normalizeImageUrl,
  uniqueImageUrls,
} from "../../lib/image-url";

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
    .map((variant) => normalizeImageUrl(variant.variant_image || variant.image_id || ""))
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
                    color: "#5d554a",
                    fontSize: 16,
                    lineHeight: 1.85,
                    maxWidth: 680,
                  }}
                >
                  {product.short_description ||
                    product.description ||
                    "Explore this textile product within the Patak Textile catalog structure."}
                </p>
              </div>

              <ProductPurchasePanel
                product={{
                  title: product.title,
                  slug: product.slug,
                  image: primaryImage,
                }}
                variants={variants}
                onVariantChange={setSelectedVariant}
              />

              <div
                style={{
                  padding: 24,
                  borderRadius: 24,
                  border: "1px solid #e5ddd2",
                  background: "#faf8f4",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#7b7367",
                    fontWeight: 700,
                  }}
                >
                  Product Details
                </div>

                <DetailRow label="Collection" value={collectionLabel} />
                <DetailRow
                  label="Category"
                  value={product.product_category || "-"}
                />
                <DetailRow label="Type" value={product.type || "-"} />
                <DetailRow
                  label="Vendor"
                  value={product.vendor || "Patak Textile"}
                />
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.15fr 0.85fr",
              gap: 24,
              alignItems: "start",
            }}
          >
            <div
              style={{
                padding: 32,
                borderRadius: 28,
                border: "1px solid #e5ddd2",
                background: "#faf8f4",
              }}
            >
              <SectionHeading
                kicker="Product Description"
                title="Crafted presentation for hospitality-focused textile projects"
                text="Explore the product with a cleaner and more refined presentation structure tailored for premium textile collections."
              />

              <div
                style={{
                  fontSize: 17,
                  lineHeight: 1.95,
                  color: "#3d392f",
                  whiteSpace: "pre-line",
                }}
              >
                {product.description ||
                  product.short_description ||
                  "No detailed description added yet."}
              </div>
            </div>

            <div
              style={{
                padding: 28,
                borderRadius: 28,
                border: "1px solid #e5ddd2",
                background: "#fff",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#7b7367",
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                Why this product page works
              </div>

              <InfoCard text="The page opens directly with the product, creating a more familiar ecommerce experience without a separate hero block." />
              <InfoCard text="Gallery, purchase actions, options, and product details are organized into a cleaner and more premium structure." />
              <InfoCard text="Variant image selection is now synchronized with the main gallery, so the visual flow feels more stable and intentional." />

              <div style={{ marginTop: 20 }}>
                <ButtonLink href="/about-us" variant="secondary">
                  Learn About Patak Textile
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {relatedProducts.length > 0 ? (
        <Section tone="soft">
          <Container>
            <SectionHeading
              kicker="Related Products"
              title="Other products from the same collection"
              text="Continue exploring similar textile presentations from the same collection family."
            />

            <div className="cards-grid cards-grid--3">
              {relatedProducts.map((item, index) => {
                const relatedSlug = normalizeLower(item.slug);

                const relatedImages = allProductImages.filter(
                  (image) => normalizeLower(image.product_slug) === relatedSlug
                );

                const relatedPrimaryImage = getPrimaryProductImage(
                  item,
                  relatedImages
                );

                return (
                  <ProductCard
                    key={`${item.slug || item.title || "related-product"}-${index}`}
                    title={item.title || "Untitled Product"}
                    description={
                      item.short_description ||
                      item.description ||
                      "No description added yet."
                    }
                    image={relatedPrimaryImage}
                    href={`/products/${item.slug || ""}`}
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 14,
        padding: "10px 0",
        borderBottom: "1px solid #eee5d9",
      }}
    >
      <span
        style={{
          color: "#7b7367",
          fontWeight: 700,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: "#171717",
          fontWeight: 800,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function InfoCard({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 18,
        background: "#faf7f1",
        border: "1px solid #e7decf",
        color: "#50493f",
        lineHeight: 1.8,
        fontSize: 15,
        marginBottom: 12,
      }}
    >
      {text}
    </div>
  );
}