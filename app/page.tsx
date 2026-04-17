import type { Metadata } from "next";
import { getSheetData } from "../lib/sheets";
import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import SectionHeading from "../components/ui/SectionHeading";
import ButtonLink from "../components/ui/ButtonLink";
import CollectionCard from "../components/cards/CollectionCard";
import ProductCard from "../components/cards/ProductCard";
import BlogCard from "../components/cards/BlogCard";
import ScrollPromo from "../components/sections/ScrollPromo";
import { buildPageMetadata } from "../lib/seo";

type ProductItem = {
  title?: string;
  slug?: string;
  description?: string;
  short_description?: string;
  image?: string;
  collection_slug?: string;
  status?: string;
  featured?: string;
  vendor?: string;
  product_category?: string;
  type?: string;
};

type CollectionItem = {
  title?: string;
  slug?: string;
  description?: string;
  image?: string;
  status?: string;
};

type BlogItem = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  image?: string;
  status?: string;
};

function normalizeText(value?: string) {
  return String(value || "").trim();
}

function isPublished(value?: string) {
  return normalizeText(value).toLowerCase() === "published";
}

async function loadHomeData() {
  try {
    const [productsData, collectionsData, blogData] = await Promise.all([
      getSheetData("products", { ttlSeconds: 300 }),
      getSheetData("collections", { ttlSeconds: 300 }),
      getSheetData("blog", { ttlSeconds: 300 }),
    ]);

    const products = (productsData as ProductItem[]).filter((item) =>
      isPublished(item.status)
    );

    const collections = (collectionsData as CollectionItem[]).filter((item) =>
      isPublished(item.status)
    );

    const blog = (blogData as BlogItem[]).filter((item) =>
      isPublished(item.status)
    );

    return {
      products,
      collections,
      blog,
    };
  } catch (error) {
    console.error("Failed to load homepage data:", error);

    return {
      products: [] as ProductItem[],
      collections: [] as CollectionItem[],
      blog: [] as BlogItem[],
    };
  }
}

export const metadata: Metadata = buildPageMetadata({
  title: "Wholesale Hospitality Textile Collections",
  description:
    "Explore structured B2B hospitality textile collections, product categories, and project-ready sourcing solutions built for hotels, resorts, residences, and contract supply needs.",
  path: "/",
});

export default async function HomePage() {
  const { products, collections, blog } = await loadHomeData();

  const featuredProducts = products.slice(0, 6);
  const featuredCollections = collections.slice(0, 4);
  const blogPosts = blog.slice(0, 3);

  return (
    <>
      <section className="home-hero">
        <img
          src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1800&q=80"
          alt="Hospitality textile collections"
          className="home-hero__image"
        />

        <div className="home-hero__overlay" />

        <Container>
          <div className="home-hero__inner">
            <div className="home-hero__badge">B2B Hospitality Textile Platform</div>

            <div className="home-hero__copy">
              <h1 className="home-hero__title">
                Structured wholesale textile presentation for hotels, resorts,
                residences, and project-based sourcing
              </h1>

              <p className="home-hero__text">
                Present collections, categories, and product families through a
                cleaner B2B experience designed for hospitality decision-makers
                and long-term procurement conversations.
              </p>
            </div>

            <div className="home-hero__actions">
              <ButtonLink href="/collections">Explore Collections</ButtonLink>
              <ButtonLink href="/products" variant="secondary">
                View Products
              </ButtonLink>
            </div>

            <div className="home-hero__features">
              <div className="home-hero__feature">
                <div className="home-hero__feature-kicker">Collections</div>
                <div className="home-hero__feature-title">Category-led</div>
                <div className="home-hero__feature-text">
                  Guide buyers through curated product groups instead of
                  disconnected listings.
                </div>
              </div>

              <div className="home-hero__feature">
                <div className="home-hero__feature-kicker">Presentation</div>
                <div className="home-hero__feature-title">Project-ready</div>
                <div className="home-hero__feature-text">
                  Support hotel, resort, residence, and contract procurement
                  discussions with clearer structure.
                </div>
              </div>

              <div className="home-hero__feature">
                <div className="home-hero__feature-kicker">Workflow</div>
                <div className="home-hero__feature-title">Scalable</div>
                <div className="home-hero__feature-text">
                  Manage products, media, and collection relations through a
                  lean content architecture.
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <ScrollPromo
        items={[
          "Hospitality Textile Collections",
          "Wholesale Product Presentation",
          "Project-Based Procurement Support",
          "Collection-Driven Catalog Structure",
          "B2B Lead Generation Flow",
          "Google Sheets Powered CMS",
        ]}
      />

      <Section tight>
        <Container>
          <div className="home-feature-grid">
            <article className="home-feature-card">
              <div style={featureKickerStyle}>01 / Positioning</div>
              <h3 style={featureTitleStyle}>Built for B2B presentation</h3>
              <p style={featureTextStyle}>
                The experience is shaped to feel more suitable for wholesale
                buyers, project teams, and procurement conversations.
              </p>
            </article>

            <article className="home-feature-card">
              <div style={featureKickerStyle}>02 / Structure</div>
              <h3 style={featureTitleStyle}>Collections guide the journey</h3>
              <p style={featureTextStyle}>
                A collection-first structure helps visitors understand
                categories, product families, and sourcing direction faster.
              </p>
            </article>

            <article className="home-feature-card">
              <div style={featureKickerStyle}>03 / Clarity</div>
              <h3 style={featureTitleStyle}>Products feel more intentional</h3>
              <p style={featureTextStyle}>
                Vendor, product category, and type data make each product page
                more useful in B2B context.
              </p>
            </article>

            <article className="home-feature-card">
              <div style={featureKickerStyle}>04 / Conversion</div>
              <h3 style={featureTitleStyle}>
                Designed for inquiry, not retail noise
              </h3>
              <p style={featureTextStyle}>
                Contact flow, request mindset, and category presentation are
                aligned with sales-qualified lead generation.
              </p>
            </article>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="home-split">
            <div className="home-split__panel">
              <SectionHeading
                kicker="Hospitality Focus"
                title="A cleaner textile presentation for project-based B2B buyers"
                text="This structure is stronger for hospitality procurement than a generic catalog or retail-first storefront."
              />

              <p>
                Buyers evaluating hospitality textile partners usually want
                clarity, category confidence, and a smoother path to inquiry.
                This experience is built to support that behavior through better
                hierarchy and more structured product presentation.
              </p>

              <p>
                Instead of overwhelming visitors with retail-style friction, the
                site creates room for collections, product families, and
                long-term sourcing conversations.
              </p>
            </div>

            <div className="home-split__media">
              <img
                src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80"
                alt="Hospitality sourcing structure"
              />
              <div className="home-split__media-overlay" />
              <div className="home-split__media-card">
                <div className="home-split__media-card-kicker">
                  B2B Textile Presentation
                </div>
                <div className="home-split__media-card-title">
                  Better hierarchy creates stronger procurement confidence
                </div>
                <div className="home-split__media-card-text">
                  Strong collection structure and clear product detail create a
                  more useful experience for wholesale buyers.
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="soft">
        <Container>
          <SectionHeading
            kicker="Collections"
            title="Explore category-led hospitality collections"
            text="Collections act as the primary browsing layer for buyers reviewing textile categories and sourcing directions."
          />

          {featuredCollections.length > 0 ? (
            <div className="cards-grid cards-grid--4">
              {featuredCollections.map((item, i) => (
                <CollectionCard
                  key={`${item.slug || item.title || "collection"}-${i}`}
                  title={item.title || "Collection"}
                  description={
                    item.description ||
                    "Explore this collection inside the hospitality textile structure."
                  }
                  image={item.image || ""}
                  href={`/collections/${item.slug || ""}`}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">No published collections found yet.</div>
          )}
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading
            kicker="Product Showcase"
            title="Products presented for wholesale and project inquiry"
            text="Each card is designed to support B2B review with cleaner structure, better category context, and stronger inquiry direction."
          />

          {featuredProducts.length > 0 ? (
            <div className="cards-grid cards-grid--3">
              {featuredProducts.map((item, i) => (
                <ProductCard
                  key={`${item.slug || item.title || "product"}-${i}`}
                  title={item.title || "Product"}
                  description={
                    item.short_description ||
                    item.description ||
                    "Explore this product inside the hospitality textile structure."
                  }
                  image={item.image || ""}
                  href={`/products/${item.slug || ""}`}
                  collectionLabel={item.collection_slug || "Product"}
                  vendor={item.vendor || ""}
                  productCategory={item.product_category || item.type || ""}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">No published products found yet.</div>
          )}
        </Container>
      </Section>

      <Section tone="soft">
        <Container>
          <SectionHeading
            kicker="Editorial"
            title="Content that supports procurement and category understanding"
            text="Editorial content helps strengthen trust, explain product groups, and support long-term hospitality conversations."
          />

          {blogPosts.length > 0 ? (
            <div className="cards-grid cards-grid--3">
              {blogPosts.map((item, i) => (
                <BlogCard
                  key={`${item.slug || item.title || "blog"}-${i}`}
                  title={item.title || "Article"}
                  excerpt={
                    item.excerpt ||
                    item.content ||
                    "Read more from the editorial side of the platform."
                  }
                  image={item.image || ""}
                  href={`/blog/${item.slug || ""}`}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">No published blog posts found yet.</div>
          )}
        </Container>
      </Section>

      <Section tight>
        <Container>
          <div className="cta-panel-strong">
            <div className="cta-panel-strong__circle--one" />
            <div className="cta-panel-strong__circle--two" />

            <div className="cta-panel-strong__inner">
              <div className="cta-panel-strong__kicker">
                Start a conversation
              </div>

              <h2 className="cta-panel-strong__title">
                Share your hospitality project, product category needs, or
                sourcing goals
              </h2>

              <p className="cta-panel-strong__text">
                Move buyers from browsing into a clearer inquiry flow with
                product families, collection visibility, and structured contact
                capture.
              </p>

              <div className="cta-panel-strong__actions">
                <ButtonLink href="/contact-us">Request Information</ButtonLink>
                <ButtonLink href="/collections" variant="secondary">
                  View Collections
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

const featureKickerStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#7a7064",
  marginBottom: 12,
};

const featureTitleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 22,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#171717",
};

const featureTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#5a5349",
  lineHeight: 1.85,
  fontSize: 15,
};