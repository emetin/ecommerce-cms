import { unstable_cache } from "next/cache";
import { getSheetData } from "./sheets";

export type ProductItem = {
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
  seo_title?: string;
  seo_description?: string;
  vendor?: string;
  product_category?: string;
  type?: string;
  tags?: string;
  created_at?: string;
  updated_at?: string;
};

export type CollectionItem = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  image?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type BlogItem = {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  image?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

const CATALOG_TTL_SECONDS = 300;

function normalizeText(value?: string) {
  return String(value || "").trim();
}

function normalizeLower(value?: string) {
  return normalizeText(value).toLowerCase();
}

function isPublished(value?: string) {
  return normalizeLower(value) === "published";
}

function hasSlug<T extends { slug?: string }>(item: T) {
  return Boolean(normalizeText(item.slug));
}

function sortByUpdatedAtDesc<
  T extends {
    updated_at?: string;
    created_at?: string;
  }
>(items: T[]) {
  return [...items].sort((a, b) => {
    const aDate = normalizeText(a.updated_at || a.created_at);
    const bDate = normalizeText(b.updated_at || b.created_at);

    return bDate.localeCompare(aDate);
  });
}

function toHomeProduct(item: ProductItem): ProductItem {
  return {
    id: normalizeText(item.id),
    title: normalizeText(item.title),
    slug: normalizeText(item.slug),
    description: normalizeText(item.description),
    short_description: normalizeText(item.short_description),
    image: normalizeText(item.image),
    gallery: normalizeText(item.gallery),
    collection_slug: normalizeText(item.collection_slug),
    status: normalizeText(item.status),
    featured: normalizeText(item.featured),
    seo_title: normalizeText(item.seo_title),
    seo_description: normalizeText(item.seo_description),
    vendor: normalizeText(item.vendor),
    product_category: normalizeText(item.product_category),
    type: normalizeText(item.type),
    tags: normalizeText(item.tags),
    created_at: normalizeText(item.created_at),
    updated_at: normalizeText(item.updated_at),
  };
}

function toHomeCollection(item: CollectionItem): CollectionItem {
  return {
    id: normalizeText(item.id),
    title: normalizeText(item.title),
    slug: normalizeText(item.slug),
    description: normalizeText(item.description),
    image: normalizeText(item.image),
    status: normalizeText(item.status),
    created_at: normalizeText(item.created_at),
    updated_at: normalizeText(item.updated_at),
  };
}

function toHomeBlogPost(item: BlogItem): BlogItem {
  return {
    id: normalizeText(item.id),
    title: normalizeText(item.title),
    slug: normalizeText(item.slug),
    excerpt: normalizeText(item.excerpt),
    content: normalizeText(item.content),
    image: normalizeText(item.image),
    status: normalizeText(item.status),
    created_at: normalizeText(item.created_at),
    updated_at: normalizeText(item.updated_at),
  };
}

export const getPublishedProducts = unstable_cache(
  async (): Promise<ProductItem[]> => {
    const data = (await getSheetData("products", {
      ttlSeconds: CATALOG_TTL_SECONDS,
    })) as ProductItem[];

    return data.filter((item) => hasSlug(item) && isPublished(item.status));
  },
  ["published-products-v2"],
  {
    revalidate: CATALOG_TTL_SECONDS,
    tags: ["sheet:products"],
  }
);

export const getPublishedCollections = unstable_cache(
  async (): Promise<CollectionItem[]> => {
    const data = (await getSheetData("collections", {
      ttlSeconds: CATALOG_TTL_SECONDS,
    })) as CollectionItem[];

    return data.filter((item) => hasSlug(item) && isPublished(item.status));
  },
  ["published-collections-v2"],
  {
    revalidate: CATALOG_TTL_SECONDS,
    tags: ["sheet:collections"],
  }
);

export const getPublishedBlogPosts = unstable_cache(
  async (): Promise<BlogItem[]> => {
    const data = (await getSheetData("blog", {
      ttlSeconds: CATALOG_TTL_SECONDS,
    })) as BlogItem[];

    return data.filter((item) => hasSlug(item) && isPublished(item.status));
  },
  ["published-blog-posts-v2"],
  {
    revalidate: CATALOG_TTL_SECONDS,
    tags: ["sheet:blog"],
  }
);

export const getHomePageData = unstable_cache(
  async () => {
    const [products, collections, blogPosts] = await Promise.all([
      getPublishedProducts(),
      getPublishedCollections(),
      getPublishedBlogPosts(),
    ]);

    return {
      products: sortByUpdatedAtDesc(products).slice(0, 6).map(toHomeProduct),
      collections: collections.slice(0, 4).map(toHomeCollection),
      blogPosts: sortByUpdatedAtDesc(blogPosts).slice(0, 3).map(toHomeBlogPost),
    };
  },
  ["home-page-data-v2"],
  {
    revalidate: CATALOG_TTL_SECONDS,
    tags: ["sheet:products", "sheet:collections", "sheet:blog"],
  }
);

export async function getProductBySlug(slug: string) {
  const products = await getPublishedProducts();
  const normalizedSlug = normalizeLower(slug);

  return (
    products.find((item) => normalizeLower(item.slug) === normalizedSlug) ||
    null
  );
}

export async function getCollectionBySlug(slug: string) {
  const collections = await getPublishedCollections();
  const normalizedSlug = normalizeLower(slug);

  return (
    collections.find((item) => normalizeLower(item.slug) === normalizedSlug) ||
    null
  );
}

export async function getBlogPostBySlug(slug: string) {
  const posts = await getPublishedBlogPosts();
  const normalizedSlug = normalizeLower(slug);

  return (
    posts.find((item) => normalizeLower(item.slug) === normalizedSlug) || null
  );
}