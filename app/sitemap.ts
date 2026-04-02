import type { MetadataRoute } from "next";
import { getSheetData } from "../lib/sheets";

type ProductItem = {
  slug?: string;
  status?: string;
  updated_at?: string;
};

type CollectionItem = {
  slug?: string;
  status?: string;
  updated_at?: string;
};

type BlogItem = {
  slug?: string;
  status?: string;
  updated_at?: string;
};

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.pataktextile.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/collections`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about-us`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact-us`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/services`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  try {
    const [productsRaw, collectionsRaw, blogRaw] = await Promise.all([
      getSheetData("products"),
      getSheetData("collections"),
      getSheetData("blog"),
    ]);

    const products = (productsRaw as ProductItem[])
      .filter((item) => String(item.status || "").trim().toLowerCase() === "published")
      .map((item) => ({
        url: `${BASE_URL}/products/${item.slug}`,
        lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

    const collections = (collectionsRaw as CollectionItem[])
      .filter((item) => String(item.status || "").trim().toLowerCase() === "published")
      .map((item) => ({
        url: `${BASE_URL}/collections/${item.slug}`,
        lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

    const blogPosts = (blogRaw as BlogItem[])
      .filter((item) => String(item.status || "").trim().toLowerCase() === "published")
      .map((item) => ({
        url: `${BASE_URL}/blog/${item.slug}`,
        lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }));

    return [...staticPages, ...products, ...collections, ...blogPosts];
  } catch {
    return staticPages;
  }
}