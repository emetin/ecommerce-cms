import type { Metadata } from "next";
import { getSheetData } from "../../lib/sheets";
import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";
import SectionHeading from "../../components/ui/SectionHeading";
import BlogCard from "../../components/cards/BlogCard";
import ButtonLink from "../../components/ui/ButtonLink";
import { buildPageMetadata } from "../../lib/seo";

type BlogItem = {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  image?: string;
  status?: string;
  featured?: string;
  created_at?: string;
  updated_at?: string;
};

export const metadata: Metadata = buildPageMetadata({
  title: "Blog",
  description:
    "Read editorial stories, hospitality textile insights, product updates and brand content from Patak Textile.",
  path: "/blog",
});

export default async function BlogPage() {
  let posts: BlogItem[] = [];
  let errorMessage = "";

  try {
    const data = await getSheetData("blog");

    posts = (data as BlogItem[]).filter(
      (item) => String(item.status || "").trim().toLowerCase() === "published"
    );
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred.";
  }

  const featuredPosts = posts
    .filter((item) => String(item.featured || "").trim().toLowerCase() === "true")
    .slice(0, 3);

  return (
    <>
      <section className="page-hero">
        <Container>
          <div className="page-hero__inner">
            <div className="page-hero__kicker">Blog</div>
            <h1 className="page-hero__title">
              Editorial stories, updates and hospitality textile insights
            </h1>
            <p className="page-hero__text">
              The blog supports brand perception, product storytelling and long-term
              SEO visibility through cleaner editorial presentation.
            </p>
          </div>
        </Container>
      </section>

      <Section tight>
        <Container>
          <ButtonLink href="/" variant="secondary">
            ← Back to Home
          </ButtonLink>
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
      ) : posts.length === 0 ? (
        <Section>
          <Container>
            <div className="empty-state">
              No published blog posts found yet. Items with status set to
              <strong> published</strong> in the Blog sheet will appear here.
            </div>
          </Container>
        </Section>
      ) : (
        <>
          {featuredPosts.length > 0 ? (
            <Section tone="soft">
              <Container>
                <SectionHeading
                  kicker="Featured Articles"
                  title="Highlighted content that supports premium brand perception"
                  text="Selected editorial articles help establish trust, communicate expertise and strengthen the hospitality textile narrative."
                />

                <div className="cards-grid cards-grid--3">
                  {featuredPosts.map((post, index) => (
                    <BlogCard
                      key={`${post.slug || post.title || "featured-blog"}-${index}`}
                      title={post.title || "Untitled Article"}
                      excerpt={
                        post.excerpt ||
                        post.content ||
                        "Read more from our editorial perspective."
                      }
                      image={post.image || ""}
                      href={`/blog/${post.slug || ""}`}
                    />
                  ))}
                </div>
              </Container>
            </Section>
          ) : null}

          <Section>
            <Container>
              <SectionHeading
                kicker="All Articles"
                title="The editorial archive"
                text="Articles are presented with a more structured layout to support readability, browsing flow and organic visibility."
              />

              <div className="cards-grid cards-grid--3">
                {posts.map((post, index) => (
                  <BlogCard
                    key={`${post.slug || post.title || "blog"}-${index}`}
                    title={post.title || "Untitled Article"}
                    excerpt={
                      post.excerpt ||
                      post.content ||
                      "Read more from our editorial perspective."
                    }
                    image={post.image || ""}
                    href={`/blog/${post.slug || ""}`}
                  />
                ))}
              </div>
            </Container>
          </Section>
        </>
      )}
    </>
  );
}