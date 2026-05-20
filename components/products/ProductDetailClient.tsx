"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, useState } from "react";
import type { CSSProperties } from "react";
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
        minHeight: 260,
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
  sort_order?: string;
  alt_text?: string;
  is_main?: string;
  created_at?: string;
  updated_at?: string;
};

type ProductDetailClientProps = {
  product: ProductItem;
  relatedProducts: ProductItem[];
  variants: VariantItem[];
  productImages: ProductImageItem[];
  allProductImages: ProductImageItem[];
};

function normalizeText(value?: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value?: unknown) {
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

function toPositiveInteger(value: unknown, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
}

function isTrue(value?: string) {
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
      normalizeImageUrl(
        variant.variant_image ||
          variant.variant_image_url ||
          variant.image_id ||
          ""
      )
    )
    .filter(Boolean);

  return uniqueImageUrls([
    primaryImage,
    ...imageManagerUrls,
    ...legacyGalleryUrls,
    ...variantUrls,
  ]);
}

function buildVariantTitle(variant: VariantItem | null) {
  if (!variant) return "";

  const directTitle =
    normalizeText(variant.title) ||
    normalizeText(variant.name) ||
    normalizeText(variant.option1_value) ||
    normalizeText(variant.option2_value) ||
    normalizeText(variant.option3_value);

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

function getVariantSku(variant: VariantItem | null, product: ProductItem) {
  return normalizeText(variant?.sku) || normalizeText(product.sku) || "-";
}

function getQuantityInfo(product: ProductItem, selectedVariant: VariantItem | null) {
  const variantBox =
    toPositiveInteger(selectedVariant?.box_quantity) ||
    toPositiveInteger(selectedVariant?.case_quantity);

  const productBox =
    toPositiveInteger(product.box_quantity) ||
    toPositiveInteger(product.case_quantity);

  const variantMin =
    toPositiveInteger(selectedVariant?.min_quantity) ||
    toPositiveInteger(selectedVariant?.minimum_quantity);

  const productMin =
    toPositiveInteger(product.min_quantity) ||
    toPositiveInteger(product.minimum_quantity);

  const packageQuantity =
    variantBox || productBox || variantMin || productMin || 1;

  const minQuantity = Math.max(
    variantMin || productMin || packageQuantity || 1,
    packageQuantity
  );

  const stepQuantity =
    toPositiveInteger(selectedVariant?.step_quantity) ||
    toPositiveInteger(product.step_quantity) ||
    packageQuantity ||
    minQuantity ||
    1;

  return {
    packageQuantity,
    minQuantity,
    stepQuantity,
  };
}

function buildSpecs(product: ProductItem, selectedVariant: VariantItem | null) {
  const quantityInfo = getQuantityInfo(product, selectedVariant);
  const variantTitle = buildVariantTitle(selectedVariant);

  return [
    {
      label: "Collection",
      value: formatCollectionLabel(product.collection_slug),
    },
    {
      label: "Vendor",
      value: normalizeText(product.vendor) || "-",
    },
    {
      label: "Category",
      value: normalizeText(product.product_category) || "-",
    },
    {
      label: "Type",
      value: normalizeText(product.type) || "-",
    },
    {
      label: "Selected Variant",
      value: variantTitle || "Standard",
    },
    {
      label: "SKU",
      value: getVariantSku(selectedVariant, product),
    },
    {
      label: "Package Quantity",
      value: String(quantityInfo.packageQuantity),
    },
    {
      label: "Minimum Order",
      value: String(quantityInfo.minQuantity),
    },
    {
      label: "Order Increment",
      value: String(quantityInfo.stepQuantity),
    },
  ];
}

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
        selectedVariant?.variant_image ||
          selectedVariant?.variant_image_url ||
          selectedVariant?.image_id ||
          ""
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
  const variantTitle = buildVariantTitle(selectedVariant);
  const quantityInfo = getQuantityInfo(product, selectedVariant);
  const specs = buildSpecs(product, selectedVariant);

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
          <div style={breadcrumbWrapStyle}>
            <ButtonLink href="/products" variant="secondary">
              ← Back to Products
            </ButtonLink>

            <div style={breadcrumbStyle}>
              Home / Products / {product.title || "Product"}
            </div>
          </div>

          <div className="product-detail-grid" style={productGridStyle}>
            <div style={galleryColumnStyle}>
              <ProductGallery
                title={product.title || "Product"}
                images={galleryImages}
                controlledActiveImage={controlledActiveImage || undefined}
                onActiveImageChange={setSelectedImage}
              />

              <div className="desktop-only" style={trustStripStyle}>
                <MiniTrustCard title="B2B Quote Flow" text="Final pricing is reviewed by the sales team." />
                <MiniTrustCard title="Pack Control" text={`Orders follow pack multiples of ${quantityInfo.packageQuantity}.`} />
                <MiniTrustCard title="Project Support" text="Suitable for hospitality and contract sourcing." />
              </div>
            </div>

            <div style={contentColumnStyle}>
              <div style={introCardStyle}>
                <div style={badgeWrapStyle}>
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

                <h1 style={titleStyle}>
                  {product.title || "Untitled Product"}
                </h1>

                <p style={leadTextStyle}>
                  {product.short_description ||
                    product.description ||
                    "Explore this product for hospitality, wholesale, and project-based sourcing."}
                </p>

                <div style={highlightGridStyle}>
                  <HighlightCard
                    label="Current Selection"
                    value={variantTitle || "Standard"}
                  />
                  <HighlightCard
                    label="Minimum Order"
                    value={`${quantityInfo.minQuantity} units`}
                  />
                  <HighlightCard
                    label="Order Increment"
                    value={`${quantityInfo.stepQuantity} units`}
                  />
                </div>

                {productTags.length > 0 ? (
                  <div style={tagWrapStyle}>
                    {productTags.slice(0, 8).map((tag) => (
                      <span key={tag} style={tagStyle}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <ProductPurchasePanel
                product={{
                  id: product.id,
                  title: product.title,
                  slug: product.slug,
                  image: primaryImage || product.image,
                  sku: product.sku,
                  price: product.price,
                  compare_at_price: product.compare_at_price,
                  box_quantity: product.box_quantity,
                  case_quantity: product.case_quantity,
                  min_quantity: product.min_quantity,
                  minimum_quantity: product.minimum_quantity,
                  step_quantity: product.step_quantity,
                }}
                variants={variants}
                onVariantChange={setSelectedVariant}
              />

              <div style={supportCardStyle}>
                <div>
                  <div style={supportKickerStyle}>Need help with this item?</div>
                  <div style={supportTitleStyle}>
                    Share your quantity, property type, and project deadline.
                  </div>
                  <p style={supportTextStyle}>
                    Our team can review availability, pack requirements, freight,
                    and wholesale pricing before final approval.
                  </p>
                </div>

                <ButtonLink href="/contact-us" variant="secondary">
                  Contact Sales
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="soft">
        <Container>
          <div className="product-info-grid" style={infoGridStyle}>
            <div style={infoCardStyle}>
              <SectionHeading
                kicker="Product Overview"
                title="Built for hospitality procurement"
                text="Review product details, ordering structure, and category information before adding the item to your quote cart."
              />

              <div style={descriptionStyle}>
                {product.description ||
                  product.short_description ||
                  "No detailed product description has been added yet."}
              </div>
            </div>

            <div style={infoCardStyle}>
              <SectionHeading
                kicker="Specifications"
                title="Product and ordering details"
                text="Use this summary to quickly validate SKU, category, pack quantity, and order increment."
              />

              <div style={specGridStyle}>
                {specs.map((item) => (
                  <MetaRow key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="procurement-grid" style={procurementGridStyle}>
            <ProcurementCard
              title="Quote-based checkout"
              text="This store is structured for B2B quote requests. No online payment is collected during checkout."
            />
            <ProcurementCard
              title="Wholesale quantity rules"
              text="Products can follow package, minimum, and step quantity rules to match operational sourcing needs."
            />
            <ProcurementCard
              title="Final review by sales"
              text="Pricing, freight, availability, and payment terms are reviewed before the order is finalized."
            />
          </div>
        </Container>
      </Section>

      {relatedProducts.length > 0 ? (
        <Section tone="soft">
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

      <style>{`
        @media (max-width: 1040px) {
          .product-detail-grid,
          .product-info-grid {
            grid-template-columns: 1fr !important;
          }

          .desktop-only {
            display: none !important;
          }
        }

        @media (max-width: 760px) {
          .procurement-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}

function MiniTrustCard({ title, text }: { title: string; text: string }) {
  return (
    <div style={miniTrustCardStyle}>
      <div style={miniTrustTitleStyle}>{title}</div>
      <div style={miniTrustTextStyle}>{text}</div>
    </div>
  );
}

function HighlightCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={highlightCardStyle}>
      <span style={highlightLabelStyle}>{label}</span>
      <strong style={highlightValueStyle}>{value}</strong>
    </div>
  );
}

function ProcurementCard({ title, text }: { title: string; text: string }) {
  return (
    <div style={procurementCardStyle}>
      <div style={procurementIconStyle}>✓</div>
      <div>
        <h3 style={procurementTitleStyle}>{title}</h3>
        <p style={procurementTextStyle}>{text}</p>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={metaRowStyle}>
      <span style={{ color: "#7b7367", fontWeight: 700 }}>{label}</span>
      <span style={{ fontWeight: 850, textAlign: "right", color: "#171717" }}>
        {value}
      </span>
    </div>
  );
}

const breadcrumbWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 24,
};

const breadcrumbStyle: CSSProperties = {
  color: "#7b7367",
  fontWeight: 700,
  fontSize: 14,
};

const productGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.05fr 0.95fr",
  gap: 42,
  alignItems: "start",
};

const galleryColumnStyle: CSSProperties = {
  display: "grid",
  gap: 16,
};

const contentColumnStyle: CSSProperties = {
  display: "grid",
  gap: 18,
};

const introCardStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 0,
};

const badgeWrapStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(2.1rem, 3.2vw, 3.5rem)",
  lineHeight: 1.03,
  fontWeight: 850,
  letterSpacing: "-0.04em",
  color: "#171717",
};

const leadTextStyle: CSSProperties = {
  margin: 0,
  color: "#5d554a",
  fontSize: 16,
  lineHeight: 1.9,
  maxWidth: 760,
};

const mainBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 32,
  width: "fit-content",
  padding: "0 12px",
  borderRadius: 999,
  background: "#f3ede3",
  color: "#2f7d62",
  fontSize: 11,
  fontWeight: 850,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const secondaryBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 32,
  width: "fit-content",
  padding: "0 12px",
  borderRadius: 999,
  background: "#faf7f1",
  color: "#6b6256",
  fontSize: 11,
  fontWeight: 850,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const highlightGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const highlightCardStyle: CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 14,
  borderRadius: 18,
  background: "#fffaf4",
  border: "1px solid #e8dfd2",
};

const highlightLabelStyle: CSSProperties = {
  color: "#7b7367",
  fontSize: 11,
  fontWeight: 850,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const highlightValueStyle: CSSProperties = {
  color: "#171717",
  fontSize: 15,
  lineHeight: 1.25,
};

const tagWrapStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const tagStyle: CSSProperties = {
  display: "inline-flex",
  minHeight: 28,
  alignItems: "center",
  padding: "0 10px",
  borderRadius: 999,
  background: "#fff",
  border: "1px solid #e8dfd2",
  color: "#6b6256",
  fontSize: 12,
  fontWeight: 700,
};

const trustStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const miniTrustCardStyle: CSSProperties = {
  padding: 14,
  borderRadius: 18,
  background: "#fff",
  border: "1px solid #e5ddd2",
};

const miniTrustTitleStyle: CSSProperties = {
  color: "#171717",
  fontSize: 13,
  fontWeight: 850,
};

const miniTrustTextStyle: CSSProperties = {
  marginTop: 5,
  color: "#6b6256",
  fontSize: 12,
  lineHeight: 1.55,
};

const supportCardStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 16,
  alignItems: "center",
  padding: 18,
  borderRadius: 22,
  border: "1px solid #e5ddd2",
  background: "#fff",
};

const supportKickerStyle: CSSProperties = {
  color: "#2f7d62",
  fontSize: 11,
  fontWeight: 850,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const supportTitleStyle: CSSProperties = {
  marginTop: 5,
  color: "#171717",
  fontSize: 16,
  fontWeight: 850,
};

const supportTextStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#6b6256",
  fontSize: 13,
  lineHeight: 1.65,
};

const infoGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.05fr 0.95fr",
  gap: 24,
  alignItems: "start",
};

const infoCardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e5ddd2",
  borderRadius: 24,
  padding: 24,
};

const descriptionStyle: CSSProperties = {
  color: "#5d554a",
  lineHeight: 1.9,
  fontSize: 15,
};

const specGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const metaRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  paddingBottom: 10,
  borderBottom: "1px solid #eee5d9",
};

const procurementGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
};

const procurementCardStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "42px minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
  padding: 20,
  borderRadius: 24,
  background: "#fff",
  border: "1px solid #e5ddd2",
};

const procurementIconStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  background: "#eef8f0",
  color: "#2f7d62",
  fontWeight: 900,
};

const procurementTitleStyle: CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 16,
  fontWeight: 850,
};

const procurementTextStyle: CSSProperties = {
  margin: "7px 0 0",
  color: "#6b6256",
  fontSize: 13,
  lineHeight: 1.7,
};

export default memo(ProductDetailClientComponent);