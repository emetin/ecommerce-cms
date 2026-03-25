import { notFound } from "next/navigation";
import { getSheetData } from "../../../lib/sheets";
import Container from "../../../components/ui/Container";
import Section from "../../../components/ui/Section";
import SectionHeading from "../../../components/ui/SectionHeading";
import ProductCard from "../../../components/cards/ProductCard";
import ButtonLink from "../../../components/ui/ButtonLink";
import DetailHero from "../../../components/sections/DetailHero";
import { buildPageMetadata } from "../../../lib/seo";

type CollectionItem = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  image?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  seo_title?: string;
  seo_description?: string;
};

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
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();

  try {
    const items = (await getSheetData("collections")) as CollectionItem[];

    const collection =
      items.find(
        (item) =>
          String(item.slug || "").trim().toLowerCase() === decodedSlug &&
          String(item.status || "").trim().toLowerCase() === "published"
      ) || null;

    if (!collection) {
      return buildPageMetadata({
        title: "Collection Not Found",
        description: "The requested collection could not be found.",
        path: `/collections/${decodedSlug}`,
      });
    }

    return buildPageMetadata({
      title: collection.seo_title || collection.title || "Collection",
      description:
        collection.seo_description ||
        collection.description ||
        "Explore this hospitality textile collection.",
      image: collection.image || "",
      path: `/collections/${decodedSlug}`,
    });
  } catch {
    return buildPageMetadata({
      title: "Collections",
      description: "Explore hospitality textile collections.",
      path: `/collections/${decodedSlug}`,
    });
  }
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();

  let collection: CollectionItem | null = null;
  let products: ProductItem[] = [];
  let errorMessage = "";

  try {
    const [collectionItems, productItems] = await Promise.all([
      getSheetData("collections"),
      getSheetData("products"),
    ]);

    const collections = collectionItems as CollectionItem[];
    const allProducts = productItems as ProductItem[];

    collection =
      collections.find(
        (item) =>
          String(item.slug || "").trim().toLowerCase() === decodedSlug &&
          String(item.status || "").trim().toLowerCase() === "published"
      ) || null;

    if (collection) {
      products = allProducts.filter((item) => {
        const itemStatus = String(item.status || "").trim().toLowerCase();
        const itemCollectionSlug = String(item.collection_slug || "")
          .trim()
          .toLowerCase();

        return itemStatus === "published" && itemCollectionSlug === decodedSlug;
      });
    }
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred.";
  }

  if (errorMessage) {
    return (
      <Section>
        <Container>
          <div
            style={{
              borderRadius: 20,
              border: "1px solid #f1c7c7",
              background: "#fff4f4",
              color: "#b42318",
              padding: 20,
            }}
          >
            <strong>Error:</strong> {errorMessage}
          </div>
        </Container>
      </Section>
    );
  }

  if (!collection) {
    notFound();
  }

  const heroImage =
    collection.image?.trim() ||
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36";

  const collectionTitle = collection.title?.trim() || "Collection";
  const collectionDescription =
    collection.description?.trim() ||
    "Explore this collection of hospitality textiles.";

  return (
    <>
      <DetailHero
        kicker="Collection"
        title={collectionTitle}
        text={collectionDescription}
        image={heroImage}
        actions={
          <>
            <ButtonLink href="/collections" variant="secondary">
              ← Back to Collections
            </ButtonLink>
            <ButtonLink href="/contact-us">
              Request Information
            </ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          <SectionHeading
            kicker="Collection Products"
            title="Products in this collection"
            text="Browse all products in this category."
          />

          {products.length > 0 ? (
            <div className="cards-grid cards-grid--3">
              {products.map((item, index) => (
                <ProductCard
                  key={item.slug || `${item.title}-${index}`}
                  title={item.title || "Product"}
                  description={
                    item.short_description ||
                    item.description ||
                    "Product detail"
                  }
                  image={item.image || ""}
                  href={`/products/${item.slug || ""}`}
                  collectionLabel={collectionTitle}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                borderRadius: 20,
                border: "1px solid #e8ddd0",
                background: "#fff",
                padding: 24,
                color: "#5d554a",
              }}
            >
              No products found in this collection.
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}