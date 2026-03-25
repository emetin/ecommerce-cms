import type { Metadata } from "next";
import { getSheetData } from "../../lib/sheets";
import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";
import ButtonLink from "../../components/ui/ButtonLink";
import SectionHeading from "../../components/ui/SectionHeading";
import ProductCard from "../../components/cards/ProductCard";
import { buildPageMetadata } from "../../lib/seo";

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

export const metadata: Metadata = buildPageMetadata({
  title: "Products",
  description:
    "Explore Patak Textile product categories presented as a corporate textile catalog for hospitality, residences and global projects.",
  path: "/products",
});

export default async function ProductsPage() {
  let products: ProductItem[] = [];
  let errorMessage = "";

  try {
    const productData = await getSheetData("products");

    products = (productData as ProductItem[])
      .filter(
        (item) => String(item.status || "").trim().toLowerCase() === "published"
      )
      .sort((a, b) => {
        const aFeatured =
          String(a.featured || "").trim().toLowerCase() === "true";
        const bFeatured =
          String(b.featured || "").trim().toLowerCase() === "true";

        if (aFeatured !== bFeatured) {
          return aFeatured ? -1 : 1;
        }

        return String(a.title || "").localeCompare(String(b.title || ""));
      });
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred.";
  }

  return (
    <>
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#f7f3ed",
          padding: "54px 0 34px",
          borderBottom: "1px solid #eee3d5",
        }}
      >
        <Container>
          <div style={{ maxWidth: 760 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 32,
                padding: "0 12px",
                borderRadius: 999,
                background: "#e9e2d6",
                color: "#5f564c",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Product Catalog
            </div>

            <h1
              style={{
                margin: "0 0 14px",
                fontSize: "clamp(2rem, 4.2vw, 3.4rem)",
                lineHeight: 1.04,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#171717",
                maxWidth: 700,
              }}
            >
              Products
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: 700,
                color: "#5d554a",
                fontSize: 15,
                lineHeight: 1.8,
              }}
            >
              Explore the product catalog with a cleaner and more focused presentation.
            </p>
          </div>
        </Container>
      </section>

      <Section tight>
        <Container>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <ButtonLink href="/" variant="secondary">
              ← Back to Home
            </ButtonLink>

            <div
              style={{
                color: "#6f6559",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {products.length} published products
            </div>
          </div>
        </Container>
      </Section>

      {errorMessage ? (
        <Section>
          <Container>
            <div className="empty-state">
              <strong>Error:</strong> {errorMessage}
            </div>
          </Container>
        </Section>
      ) : products.length === 0 ? (
        <Section>
          <Container>
            <div className="empty-state">
              No published products found yet. Items with status set to
              <strong> published</strong> in the products sheet will appear here.
            </div>
          </Container>
        </Section>
      ) : (
        <Section>
          <Container>
            <SectionHeading
              kicker="Catalog"
              title="All products"
              text="Browse all available textile products in a cleaner catalog layout."
            />

            <div className="cards-grid cards-grid--3">
              {products.map((product, index) => (
                <ProductCard
                  key={`${product.slug || product.title || "product"}-${index}`}
                  title={product.title || "Untitled Product"}
                  description={
                    product.short_description ||
                    product.description ||
                    "Explore this textile product within the Patak Textile catalog structure."
                  }
                  image={product.image || ""}
                  href={`/products/${product.slug || ""}`}
                />
              ))}
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}