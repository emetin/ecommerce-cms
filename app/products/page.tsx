import type { Metadata } from "next";
import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";
import ButtonLink from "../../components/ui/ButtonLink";
import SectionHeading from "../../components/ui/SectionHeading";
import ProductCard from "../../components/cards/ProductCard";
import { buildPageMetadata } from "../../lib/seo";
import {
  getPrimaryProductImage,
  getProductsAndImages,
  getPublishedProducts,
  type ProductItem,
} from "../../lib/product-data";

export const revalidate = 1800;

export const metadata: Metadata = buildPageMetadata({
  title: "Products",
  description:
    "Explore Patak Textile product categories presented as a corporate textile catalog for hospitality, residences and global projects.",
  path: "/products",
});

type PreparedProduct = ProductItem & {
  preparedImage: string;
  preparedTitle: string;
  preparedDescription: string;
  preparedHref: string;
};

function prepareProducts(
  products: ProductItem[],
  imagesBySlug: Map<string, Record<string, string>[]>
): PreparedProduct[] {
  const publishedProducts = getPublishedProducts(products);

  return publishedProducts.map((product) => {
    const slug = String(product.slug || "").trim().toLowerCase();
    const productImages = imagesBySlug.get(slug) || [];
    const primaryImage = getPrimaryProductImage(product, productImages);

    return {
      ...product,
      preparedImage: primaryImage,
      preparedTitle: product.title || "Untitled Product",
      preparedDescription:
        product.short_description ||
        product.description ||
        "Explore this textile product within the Patak Textile catalog structure.",
      preparedHref: `/products/${product.slug || ""}`,
    };
  });
}

export default async function ProductsPage() {
  let preparedProducts: PreparedProduct[] = [];
  let errorMessage = "";

  try {
    const { products, imagesBySlug } = await getProductsAndImages(1800);
    preparedProducts = prepareProducts(products, imagesBySlug);
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
              {preparedProducts.length} published products
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
      ) : preparedProducts.length === 0 ? (
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
              {preparedProducts.map((product, index) => (
                <ProductCard
                  key={`${product.slug || product.title || "product"}-${index}`}
                  title={product.preparedTitle}
                  description={product.preparedDescription}
                  image={product.preparedImage}
                  href={product.preparedHref}
                  prefetch={false}
                />
              ))}
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}