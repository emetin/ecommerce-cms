import { notFound } from "next/navigation";
import { getSheetData } from "../../../lib/sheets";
import Container from "../../../components/ui/Container";
import Section from "../../../components/ui/Section";
import SectionHeading from "../../../components/ui/SectionHeading";
import BlogCard from "../../../components/cards/BlogCard";
import ButtonLink from "../../../components/ui/ButtonLink";
import DetailHero from "../../../components/sections/DetailHero";
import { buildPageMetadata } from "../../../lib/seo";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();

  try {
    const items = (await getSheetData("blog")) as BlogItem[];
    const post =
      items.find(
        (item) =>
          String(item.slug || "").trim().toLowerCase() === decodedSlug &&
          String(item.status || "").trim().toLowerCase() === "published"
      ) || null;

    if (!post) {
      return buildPageMetadata({
        title: "Article Not Found",
        description: "The requested article could not be found.",
        path: `/blog/${decodedSlug}`,
      });
    }

    return buildPageMetadata({
      title: post.title || "Blog Article",
      description:
        post.excerpt ||
        post.content ||
        "Read more from Patak Textile editorial content.",
      image: post.image || "",
      path: `/blog/${decodedSlug}`,
    });
  } catch {
    return buildPageMetadata({
      title: "Blog",
      description: "Editorial content and hospitality textile insights.",
      path: `/blog/${decodedSlug}`,
    });
  }
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();

  let post: BlogItem | null = null;
  let relatedPosts: BlogItem[] = [];
  let errorMessage = "";

  try {
    const items = (await getSheetData("blog")) as BlogItem[];

    const foundPost =
      items.find(
        (item) =>
          String(item.slug || "").trim().toLowerCase() === decodedSlug &&
          String(item.status || "").trim().toLowerCase() === "published"
      ) || null;

    post = foundPost;

    if (foundPost) {
      relatedPosts = items
        .filter((item) => {
          const itemSlug = String(item.slug || "").trim().toLowerCase();
          const itemStatus = String(item.status || "").trim().toLowerCase();

          return itemSlug !== decodedSlug && itemStatus === "published";
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

  if (!post) {
    notFound();
  }

  const heroImage =
    post.image?.trim() ||
    "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=80";

  return (
    <>
      <Section tight>
        <Container>
          <ButtonLink href="/blog" variant="secondary">
            ← Back to Blog
          </ButtonLink>
        </Container>
      </Section>

      <DetailHero
        kicker="Editorial"
        title={post.title || "Untitled Article"}
        text={post.excerpt || "Read more from our editorial perspective."}
        image={heroImage}
        actions={
          <>
            <ButtonLink href="/contact-us" variant="accent">
              Contact Us
            </ButtonLink>
            <ButtonLink href="/blog" variant="secondary">
              Back to Articles
            </ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          <div className="article-body">
            {post.content || "No content added yet."}
          </div>
        </Container>
      </Section>

      {relatedPosts.length > 0 ? (
        <Section tone="soft">
          <Container>
            <SectionHeading
              kicker="More Articles"
              title="Continue exploring the editorial archive"
              text="Additional articles help visitors discover more about the brand and textile perspective."
            />

            <div className="cards-grid cards-grid--3">
              {relatedPosts.map((item, index) => (
                <BlogCard
                  key={`${item.slug || item.title || "related-blog"}-${index}`}
                  title={item.title || "Untitled Article"}
                  excerpt={
                    item.excerpt ||
                    item.content ||
                    "Read more from our editorial perspective."
                  }
                  image={item.image || ""}
                  href={`/blog/${item.slug || ""}`}
                />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}