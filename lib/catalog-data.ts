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
};

export type CollectionItem = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  image?: string;
  status?: string;
};

export type BlogItem = {
  id?: string;
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

export const getPublishedProducts = unstable_cache(
  async (): Promise<ProductItem[]> => {
    const data = (await getSheetData("products", {
      ttlSeconds: 300,
    })) as ProductItem[];

    return data.filter((item) => isPublished(item.status));
  },
  ["published-products"],
  {
    revalidate: 300,
    tags: ["sheet:products"],
  }
);

export const getPublishedCollections = unstable_cache(
  async (): Promise<CollectionItem[]> => {
    const data = (await getSheetData("collections", {
      ttlSeconds: 300,
    })) as CollectionItem[];

    return data.filter((item) => isPublished(item.status));
  },
  ["published-collections"],
  {
    revalidate: 300,
    tags: ["sheet:collections"],
  }
);

export const getPublishedBlogPosts = unstable_cache(
  async (): Promise<BlogItem[]> => {
    const data = (await getSheetData("blog", {
      ttlSeconds: 300,
    })) as BlogItem[];

    return data.filter((item) => isPublished(item.status));
  },
  ["published-blog-posts"],
  {
    revalidate: 300,
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
      products,
      collections,
      blogPosts,
    };
  },
  ["home-page-data"],
  {
    revalidate: 300,
    tags: ["sheet:products", "sheet:collections", "sheet:blog"],
  }
);

export async function getProductBySlug(slug: string) {
  const products = await getPublishedProducts();
  const normalizedSlug = normalizeText(slug).toLowerCase();

  return (
    products.find(
      (item) => normalizeText(item.slug).toLowerCase() === normalizedSlug
    ) || null
  );
}

export async function getCollectionBySlug(slug: string) {
  const collections = await getPublishedCollections();
  const normalizedSlug = normalizeText(slug).toLowerCase();

  return (
    collections.find(
      (item) => normalizeText(item.slug).toLowerCase() === normalizedSlug
    ) || null
  );
}

export async function getBlogPostBySlug(slug: string) {
  const posts = await getPublishedBlogPosts();
  const normalizedSlug = normalizeText(slug).toLowerCase();

  return (
    posts.find(
      (item) => normalizeText(item.slug).toLowerCase() === normalizedSlug
    ) || null
  );
}