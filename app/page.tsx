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
  title: "Patak Textile",
  description:
    "Patak Textile presents premium textile collections for hospitality, residences and refined project-based environments through a stronger corporate catalog structure.",
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
          alt="Patak Textile"
          className="home-hero__image"
        />

        <div className="home-hero__overlay" />

        <Container>
          <div className="home-hero__inner">
            <div className="home-hero__badge">Premium Textile Solutions</div>

            <div className="home-hero__copy">
              <h1 className="home-hero__title">
                Textile Manufacturing for Hospitality, Residences and Global Projects
              </h1>

              <p className="home-hero__text">
                Patak Textile brings together product clarity, premium material
                standards and a more trusted digital presentation for visitors who
                expect a stronger corporate textile experience.
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
                <div className="home-hero__feature-kicker">Production</div>
                <div className="home-hero__feature-title">Structured</div>
                <div className="home-hero__feature-text">
                  Built around manufacturing discipline, category structure and long-term brand trust.
                </div>
              </div>

              <div className="home-hero__feature">
                <div className="home-hero__feature-kicker">Quality</div>
                <div className="home-hero__feature-title">Refined</div>
                <div className="home-hero__feature-text">
                  A cleaner and more premium presentation for products, collections and brand communication.
                </div>
              </div>

              <div className="home-hero__feature">
                <div className="home-hero__feature-kicker">Supply</div>
                <div className="home-hero__feature-title">Reliable</div>
                <div className="home-hero__feature-text">
                  Stronger confidence for visitors exploring textile categories and future partnerships.
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <ScrollPromo
        items={[
          "Premium Hospitality Textile",
          "Trusted Manufacturing Approach",
          "Category-Driven Presentation",
          "Refined Brand Experience",
          "Project-Ready Product Structure",
          "Long-Term Textile Partnership",
        ]}
      />

      <Section tight>
        <Container>
          <div className="home-feature-grid">
            <article className="home-feature-card">
              <div style={featureKickerStyle}>01 / Identity</div>
              <h3 style={featureTitleStyle}>A stronger corporate impression</h3>
              <p style={featureTextStyle}>
                The digital experience should communicate confidence before any future ecommerce transition.
              </p>
            </article>

            <article className="home-feature-card">
              <div style={featureKickerStyle}>02 / Clarity</div>
              <h3 style={featureTitleStyle}>Collections lead the journey</h3>
              <p style={featureTextStyle}>
                Product families should structure the browsing flow more clearly than a retail storefront.
              </p>
            </article>

            <article className="home-feature-card">
              <div style={featureKickerStyle}>03 / Presentation</div>
              <h3 style={featureTitleStyle}>Editorial, not transactional</h3>
              <p style={featureTextStyle}>
                The site now feels more like a premium textile showcase than a generic product grid.
              </p>
            </article>

            <article className="home-feature-card">
              <div style={featureKickerStyle}>04 / Future</div>
              <h3 style={featureTitleStyle}>Ready for expansion later</h3>
              <p style={featureTextStyle}>
                The structure still protects future ecommerce growth while feeling right for today’s launch.
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
                kicker="About Patak Textile"
                title="A calmer, stronger and more premium textile presentation"
                text="This homepage is now positioned to feel more like a trusted manufacturing brand than a direct retail storefront."
              />

              <p>
                The structure supports better rhythm, stronger category hierarchy and
                a cleaner brand impression. Instead of pushing users too quickly into
                shopping behavior, it gives them space to understand the company,
                the collections and the visual quality of the presentation.
              </p>

              <p>
                That subtle shift is what creates prestige. It feels intentional,
                slower, better curated and more suitable for a textile brand that
                wants to be taken seriously.
              </p>
            </div>

            <div className="home-split__media">
              <img
                src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80"
                alt="Textile production"
              />
              <div className="home-split__media-overlay" />
              <div className="home-split__media-card">
                <div className="home-split__media-card-kicker">
                  Corporate Textile Presence
                </div>
                <div className="home-split__media-card-title">
                  Prestige grows through control, restraint and stronger presentation
                </div>
                <div className="home-split__media-card-text">
                  A few careful design choices can create much more confidence than heavy visual noise.
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
            text="Collections are now the primary exploration layer, which makes the site feel more premium and category-led."
          />

          {featuredCollections.length > 0 ? (
            <div className="cards-grid cards-grid--4">
              {featuredCollections.map((item, i) => (
                <CollectionCard
                  key={`${item.slug || item.title || "collection"}-${i}`}
                  title={item.title || "Collection"}
                  description={
                    item.description ||
                    "Explore this hospitality-focused textile collection."
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
            title="Products presented with more polish and restraint"
            text="The cards stay simple, but the spacing, hierarchy and visual rhythm now support a more premium textile identity."
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
                    "Explore this hospitality textile product."
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
            title="Brand perspective, not just content"
            text="Editorial cards help the brand feel more complete and less like a catalog built overnight."
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
                    "Read more from our hospitality textile perspective."
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
              <div className="cta-panel-strong__kicker">Continue the presentation</div>

              <h2 className="cta-panel-strong__title">
                Explore Patak Textile through a cleaner, calmer and more prestigious structure
              </h2>

              <p className="cta-panel-strong__text">
                The right amount of visual quality does not need noise. It needs a better hierarchy, better rhythm and a more intentional digital experience.
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