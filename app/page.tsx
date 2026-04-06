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

export const metadata: Metadata = buildPageMetadata({
  title: "Global CMS",
  description:
    "Global CMS presents a structured catalog experience powered by Google Sheets, internal admin workflows, and scalable content architecture.",
  path: "/",
});

export default async function HomePage() {
  const [productsData, collectionsData, blogData] = await Promise.all([
    getSheetData("products"),
    getSheetData("collections"),
    getSheetData("blog"),
  ]);

  const products = (productsData as ProductItem[]).filter(
    (item) => String(item.status || "").trim().toLowerCase() === "published"
  );

  const collections = (collectionsData as CollectionItem[]).filter(
    (item) => String(item.status || "").trim().toLowerCase() === "published"
  );

  const blog = (blogData as BlogItem[]).filter(
    (item) => String(item.status || "").trim().toLowerCase() === "published"
  );

  const featuredProducts = products.slice(0, 3);
  const featuredCollections = collections.slice(0, 4);
  const blogPosts = blog.slice(0, 3);

  return (
    <>
      <section className="home-hero">
        <img
          src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1800&q=80"
          alt="Global CMS"
          className="home-hero__image"
        />

        <div className="home-hero__overlay" />

        <Container>
          <div className="home-hero__inner">
            <div className="home-hero__badge">Structured Content Management</div>

            <div className="home-hero__copy">
              <h1 className="home-hero__title">
                Scalable Catalog Management for Products, Collections and Editorial Content
              </h1>

              <p className="home-hero__text">
                Global CMS brings together structured content, flexible data management,
                and a cleaner digital presentation for modern catalog-based websites.
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
                <div className="home-hero__feature-kicker">Architecture</div>
                <div className="home-hero__feature-title">Structured</div>
                <div className="home-hero__feature-text">
                  Built around modular content, clear hierarchy and long-term maintainability.
                </div>
              </div>

              <div className="home-hero__feature">
                <div className="home-hero__feature-kicker">Content</div>
                <div className="home-hero__feature-title">Flexible</div>
                <div className="home-hero__feature-text">
                  A lightweight system for managing products, collections and editorial content.
                </div>
              </div>

              <div className="home-hero__feature">
                <div className="home-hero__feature-kicker">Workflow</div>
                <div className="home-hero__feature-title">Reliable</div>
                <div className="home-hero__feature-text">
                  A practical admin structure powered by Google Sheets and internal tools.
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <ScrollPromo
        items={[
          "Google Sheets Powered CMS",
          "Structured Product Management",
          "Collection-Driven Architecture",
          "Editorial Content Support",
          "Scalable Internal Admin Panel",
          "Flexible Catalog Workflow",
        ]}
      />

      <Section tight>
        <Container>
          <div className="home-feature-grid">
            <article className="home-feature-card">
              <div style={featureKickerStyle}>01 / Identity</div>
              <h3 style={featureTitleStyle}>A cleaner product foundation</h3>
              <p style={featureTextStyle}>
                The system is built to feel reliable, clear and scalable from the beginning.
              </p>
            </article>

            <article className="home-feature-card">
              <div style={featureKickerStyle}>02 / Clarity</div>
              <h3 style={featureTitleStyle}>Collections lead the structure</h3>
              <p style={featureTextStyle}>
                Category hierarchy and collection flow make the browsing experience more intentional.
              </p>
            </article>

            <article className="home-feature-card">
              <div style={featureKickerStyle}>03 / Presentation</div>
              <h3 style={featureTitleStyle}>Editorial, not overloaded</h3>
              <p style={featureTextStyle}>
                The interface stays focused on clarity, spacing and strong content presentation.
              </p>
            </article>

            <article className="home-feature-card">
              <div style={featureKickerStyle}>04 / Future</div>
              <h3 style={featureTitleStyle}>Ready for expansion</h3>
              <p style={featureTextStyle}>
                The structure supports future growth without forcing unnecessary ecommerce complexity today.
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
                kicker="About Global CMS"
                title="A calmer, stronger and more structured content experience"
                text="This homepage is positioned to feel more like a scalable content platform than a temporary catalog layout."
              />

              <p>
                The structure supports better rhythm, stronger category hierarchy and
                a cleaner product presentation. Instead of pushing users into a heavy
                ecommerce experience, it gives them space to understand the system,
                the collections and the overall content architecture.
              </p>

              <p>
                That clarity creates confidence. It feels more intentional,
                better organized and more suitable for teams that want
                maintainable content operations.
              </p>
            </div>

            <div className="home-split__media">
              <img
                src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80"
                alt="Content architecture"
              />
              <div className="home-split__media-overlay" />
              <div className="home-split__media-card">
                <div className="home-split__media-card-kicker">
                  Scalable Content Foundation
                </div>
                <div className="home-split__media-card-title">
                  Better structure creates better long-term control
                </div>
                <div className="home-split__media-card-text">
                  A few careful architectural decisions can create much more value than visual complexity.
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
            title="A more elegant collection-first structure"
            text="Collections are the primary exploration layer, helping the project feel more structured and category-led."
          />

          {featuredCollections.length > 0 ? (
            <div className="cards-grid cards-grid--4">
              {featuredCollections.map((item, i) => (
                <CollectionCard
                  key={`${item.slug || item.title || "collection"}-${i}`}
                  title={item.title || "Collection"}
                  description={
                    item.description ||
                    "Explore this collection inside the Global CMS structure."
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
            title="Products presented with more clarity and consistency"
            text="The cards stay simple, while spacing and hierarchy support a stronger catalog experience."
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
                    "Explore this product inside the Global CMS structure."
                  }
                  image={item.image || ""}
                  href={`/products/${item.slug || ""}`}
                  collectionLabel={item.collection_slug || "Product"}
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
            title="Content that supports the full platform"
            text="Editorial cards help the project feel more complete, organized and presentation-ready."
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
              <div className="cta-panel-strong__kicker">Continue exploring</div>

              <h2 className="cta-panel-strong__title">
                Explore Global CMS through a cleaner, more structured and scalable architecture
              </h2>

              <p className="cta-panel-strong__text">
                The right amount of quality does not need noise. It needs stronger hierarchy,
                better rhythm and a more intentional content experience.
              </p>

              <div className="cta-panel-strong__actions">
                <ButtonLink href="/collections">View Collections</ButtonLink>
                <ButtonLink href="/contact-us" variant="secondary">
                  Contact Us
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