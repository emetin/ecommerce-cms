"use client";

import { useMemo, useState } from "react";
import Container from "../ui/Container";
import Section from "../ui/Section";
import SectionHeading from "../ui/SectionHeading";
import ButtonLink from "../ui/ButtonLink";
import ProductCard from "../cards/ProductCard";
import ProductGallery from "./ProductGallery";
import ProductPurchasePanel, { VariantItem } from "./ProductPurchasePanel";
import { normalizeImageUrl } from "../../lib/image-url";

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

type ProductDetailClientProps = {
  product: ProductItem;
  relatedProducts: ProductItem[];
  variants: VariantItem[];
  galleryImages: string[];
  collectionLabel: string;
};

function getVariantImage(variant?: VariantItem | null) {
  if (!variant) return "";
  return normalizeImageUrl(
    String(variant.variant_image || variant.image_id || "").trim()
  );
}

export default function ProductDetailClient({
  product,
  relatedProducts,
  variants,
  galleryImages,
  collectionLabel,
}: ProductDetailClientProps) {
  const normalizedProductImage = normalizeImageUrl(product.image || "");

  const initialImage = useMemo(() => {
    return galleryImages[0] || normalizedProductImage || "";
  }, [galleryImages, normalizedProductImage]);

  const [selectedImage, setSelectedImage] = useState(initialImage);

  function handleVariantChange(variant: VariantItem | null) {
    const variantImage = getVariantImage(variant);

    if (variantImage && galleryImages.includes(variantImage)) {
      setSelectedImage(variantImage);
      return;
    }

    if (variantImage) {
      setSelectedImage(variantImage);
      return;
    }

    setSelectedImage(initialImage);
  }

  const galleryWithSelected = useMemo(() => {
    if (!selectedImage) return galleryImages;
    if (galleryImages.includes(selectedImage)) return galleryImages;
    return [selectedImage, ...galleryImages].filter(Boolean);
  }, [galleryImages, selectedImage]);

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
              images={galleryWithSelected}
              controlledActiveImage={selectedImage}
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
                  image: normalizedProductImage,
                }}
                variants={variants}
                onVariantChange={handleVariantChange}
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
              <InfoCard text="Variant selection now supports image switching so the product presentation feels more complete and intuitive." />

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
              {relatedProducts.map((item, index) => (
                <ProductCard
                  key={`${item.slug || item.title || "related-product"}-${index}`}
                  title={item.title || "Untitled Product"}
                  description={
                    item.short_description ||
                    item.description ||
                    "No description added yet."
                  }
                  image={item.image || ""}
                  href={`/products/${item.slug || ""}`}
                />
              ))}
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