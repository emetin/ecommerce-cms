import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSheetData } from "../../../lib/sheets";
import Container from "../../../components/ui/Container";
import Section from "../../../components/ui/Section";
import SectionHeading from "../../../components/ui/SectionHeading";
import ButtonLink from "../../../components/ui/ButtonLink";
import ProductCard from "../../../components/cards/ProductCard";
import ProductGallery from "../../../components/products/ProductGallery";
import ProductPurchasePanel from "../../../components/products/ProductPurchasePanel";
import { buildPageMetadata } from "../../../lib/seo";

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

type VariantItem = {
  id?: string;
  product_slug?: string;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  sku?: string;
  barcode?: string;
  price?: string;
  compare_at_price?: string;
  inventory_tracker?: string;
  inventory_policy?: string;
  fulfillment_service?: string;
  requires_shipping?: string;
  taxable?: string;
  variant_image?: string;
  weight?: string;
  weight_unit?: string;
  box_quantity?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type ProductImageItem = {
  id?: string;
  product_slug?: string;
  image_url?: string;
  sort_order?: string;
  alt_text?: string;
  created_at?: string;
  updated_at?: string;
};

function formatCollectionLabel(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "Product";

  return raw
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseGallery(
  product: ProductItem,
  variants: VariantItem[],
  productImages: ProductImageItem[]
) {
  const variantImages = variants
    .map((variant) => String(variant.variant_image || "").trim())
    .filter(Boolean);

  const sortedProductImages = [...productImages]
    .sort((a, b) => {
      const aOrder = Number(String(a.sort_order || "").trim());
      const bOrder = Number(String(b.sort_order || "").trim());
      const aValue = Number.isFinite(aOrder) ? aOrder : 999999;
      const bValue = Number.isFinite(bOrder) ? bOrder : 999999;
      return aValue - bValue;
    })
    .map((item) => String(item.image_url || "").trim())
    .filter(Boolean);

  const manualGallery = String(product.gallery || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const all = [
    String(product.image || "").trim(),
    ...sortedProductImages,
    ...manualGallery,
    ...variantImages,
  ].filter(Boolean);

  return Array.from(new Set(all));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();

  try {
    const items = (await getSheetData("products")) as ProductItem[];
    const product =
      items.find(
        (item) =>
          String(item.slug || "").trim().toLowerCase() === decodedSlug &&
          String(item.status || "").trim().toLowerCase() === "published"
      ) || null;

    if (!product) {
      return buildPageMetadata({
        title: "Product Not Found",
        description: "The requested product could not be found.",
        path: `/products/${decodedSlug}`,
      });
    }

    return buildPageMetadata({
      title: product.seo_title || product.title || "Product",
      description:
        product.seo_description ||
        product.short_description ||
        product.description ||
        "Explore this hospitality textile product.",
      image: product.image || "",
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
  let errorMessage = "";

  try {
    const [productData, variantData, imageData] = await Promise.all([
      getSheetData("products"),
      getSheetData("product_variants"),
      getSheetData("product_images"),
    ]);

    const items = productData as ProductItem[];
    const allVariants = variantData as VariantItem[];
    const allProductImages = imageData as ProductImageItem[];

    const foundProduct =
      items.find(
        (item) =>
          String(item.slug || "").trim().toLowerCase() === decodedSlug &&
          String(item.status || "").trim().toLowerCase() === "published"
      ) || null;

    product = foundProduct;

    if (foundProduct) {
      const currentCollectionSlug = String(foundProduct.collection_slug || "")
        .trim()
        .toLowerCase();

      variants = allVariants.filter((variant) => {
        const variantSlug = String(variant.product_slug || "")
          .trim()
          .toLowerCase();
        const variantStatus = String(variant.status || "")
          .trim()
          .toLowerCase();

        return (
          variantSlug === decodedSlug &&
          (variantStatus === "published" || variantStatus === "")
        );
      });

      productImages = allProductImages.filter((item) => {
        const itemSlug = String(item.product_slug || "").trim().toLowerCase();
        return itemSlug === decodedSlug;
      });

      relatedProducts = items
        .filter((item) => {
          const itemSlug = String(item.slug || "").trim().toLowerCase();
          const itemStatus = String(item.status || "").trim().toLowerCase();
          const itemCollectionSlug = String(item.collection_slug || "")
            .trim()
            .toLowerCase();

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
      <Section>
        <Container>
          <div className="empty-state">
            <strong>Error:</strong> {errorMessage}
          </div>
        </Container>
      </Section>
    );
  }

  if (!product) {
    notFound();
  }

  const galleryImages = parseGallery(product, variants, productImages);
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
                  image: product.image,
                }}
                variants={variants}
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
                <DetailRow label="Category" value={product.product_category || "-"} />
                <DetailRow label="Type" value={product.type || "-"} />
                <DetailRow label="Vendor" value={product.vendor || "Patak Textile"} />
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
                title="Detailed product presentation"
                text="Explore the product through a cleaner and more structured catalog layout."
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
                Product Summary
              </div>

              <InfoCard text="This page is structured for a premium catalog presentation rather than a complex ecommerce flow." />
              <InfoCard text="Gallery images, options, and key product details are organized to support a cleaner client experience." />
              <InfoCard text="Use this section to guide visitors toward inquiry, quotation, and product discovery." />

              <div style={{ marginTop: 20 }}>
                <ButtonLink href="/contact-us" variant="secondary">
                  Contact Sales
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