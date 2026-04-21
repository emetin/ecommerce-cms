import { cache } from "react";
import { notFound } from "next/navigation";
import { getSheetData } from "../../../lib/sheets";
import Container from "../../../components/ui/Container";
import Section from "../../../components/ui/Section";
import SectionHeading from "../../../components/ui/SectionHeading";
import ProductCard from "../../../components/cards/ProductCard";
import ButtonLink from "../../../components/ui/ButtonLink";
import DetailHero from "../../../components/sections/DetailHero";
import { buildPageMetadata } from "../../../lib/seo";
import { normalizeImageUrl } from "../../../lib/image-url";

export const revalidate = 1800;

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
  vendor?: string;
  product_category?: string;
  type?: string;
  tags?: string;
};

type CollectionProductItem = {
  id?: string;
  collection_slug?: string;
  product_slug?: string;
  sort_order?: string;
  created_at?: string;
  updated_at?: string;
};

function normalizeText(value?: string) {
  return String(value || "").trim();
}

function normalizeLower(value?: string) {
  return normalizeText(value).toLowerCase();
}

function toSafeOrder(value?: string) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : 999999;
}

const getCollectionsCatalogData = cache(async () => {
  const [collectionItems, productItems, collectionProductItems] =
    await Promise.all([
      getSheetData("collections", { ttlSeconds: 1800 }),
      getSheetData("products", { ttlSeconds: 1800 }),
      getSheetData("collection_products", { ttlSeconds: 1800 }),
    ]);

  const collections = collectionItems as CollectionItem[];
  const allProducts = productItems as ProductItem[];
  const collectionProducts = collectionProductItems as CollectionProductItem[];

  const publishedCollections = collections.filter(
    (item) =>
      normalizeLower(item.status) === "published" &&
      Boolean(normalizeLower(item.slug))
  );

  const publishedProducts = allProducts.filter(
    (item) =>
      normalizeLower(item.status) === "published" &&
      Boolean(normalizeLower(item.slug))
  );

  const productMap = new Map<string, ProductItem>();
  for (const item of publishedProducts) {
    productMap.set(normalizeLower(item.slug), item);
  }

  const collectionRelationsMap = new Map<string, CollectionProductItem[]>();
  for (const relation of collectionProducts) {
    const collectionSlug = normalizeLower(relation.collection_slug);
    if (!collectionSlug) continue;

    const current = collectionRelationsMap.get(collectionSlug);
    if (current) {
      current.push(relation);
    } else {
      collectionRelationsMap.set(collectionSlug, [relation]);
    }
  }

  for (const [slug, items] of collectionRelationsMap.entries()) {
    collectionRelationsMap.set(
      slug,
      [...items].sort((a, b) => toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order))
    );
  }

  return {
    collections,
    allProducts,
    collectionProducts,
    publishedCollections,
    publishedProducts,
    productMap,
    collectionRelationsMap,
  };
});

const getCollectionPageData = cache(async (slug: string) => {
  const normalizedSlug = normalizeLower(slug);
  const { publishedCollections, publishedProducts, productMap, collectionRelationsMap } =
    await getCollectionsCatalogData();

  const collection =
    publishedCollections.find(
      (item) => normalizeLower(item.slug) === normalizedSlug
    ) || null;

  if (!collection) {
    return {
      collection: null,
      products: [] as ProductItem[],
    };
  }

  const relatedCollectionProducts =
    collectionRelationsMap.get(normalizedSlug) || [];

  let products: ProductItem[] = [];

  if (relatedCollectionProducts.length > 0) {
    products = relatedCollectionProducts
      .map((relation) => productMap.get(normalizeLower(relation.product_slug)))
      .filter(Boolean) as ProductItem[];
  } else {
    products = publishedProducts.filter(
      (item) => normalizeLower(item.collection_slug) === normalizedSlug
    );
  }

  return {
    collection,
    products,
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();

  try {
    const { collection } = await getCollectionPageData(decodedSlug);

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
      image: normalizeImageUrl(collection.image || ""),
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

  let errorMessage = "";
  let collection: CollectionItem | null = null;
  let products: ProductItem[] = [];

  try {
    const data = await getCollectionPageData(decodedSlug);
    collection = data.collection;
    products = data.products;
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
    normalizeImageUrl(collection.image || "") ||
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=80";

  const collectionTitle = normalizeText(collection.title) || "Collection";
  const collectionDescription =
    normalizeText(collection.description) ||
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
            <ButtonLink href="/contact-us">Request Information</ButtonLink>
          </>
        }
      />

      <Section>
        <Container>
          <SectionHeading
            kicker="Collection Products"
            title="Products in this collection"
            text="This selection is managed directly through the CMS relation structure for cleaner B2B presentation and ordering."
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
                  vendor={item.vendor || ""}
                  productCategory={item.product_category || ""}
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