import { NextRequest, NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type Product = Record<string, string>;
type ProductImage = Record<string, string>;

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function text(value: unknown) {
  return String(value || "").trim();
}

function isTrue(value: unknown) {
  return normalize(value) === "true";
}

function safeParseArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function toProductItem(item: Product) {
  return {
    id: text(item.id),
    title: text(item.title),
    slug: text(item.slug),
    description: text(item.description),
    short_description: text(item.short_description),
    image: text(item.image),
    image_file_id: text(item.image_file_id),
    image_alt: text(item.image_alt),
    image_uploaded_at: text(item.image_uploaded_at),
    gallery: text(item.gallery),
    collection_slug: text(item.collection_slug),
    status: text(item.status),
    featured: text(item.featured),
    seo_title: text(item.seo_title),
    seo_description: text(item.seo_description),
    created_at: text(item.created_at),
    updated_at: text(item.updated_at),
    vendor: text(item.vendor),
    product_category: text(item.product_category),
    type: text(item.type),
    tags: text(item.tags),
    collection: text(item.collection),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const q = normalize(searchParams.get("q"));
    const status = normalize(searchParams.get("status"));
    const collection = normalize(searchParams.get("collection"));
    const featured = normalize(searchParams.get("featured"));

    const pageRaw = Number(searchParams.get("page") || 1);
    const limitRaw = Number(searchParams.get("limit") || 50);

    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;

    const [rawProducts, rawImages] = await Promise.all([
      getSheetData("products", { ttlSeconds: 120 }),
      getSheetData("product_images", { ttlSeconds: 120 }),
    ]);

    const products = safeParseArray<Product>(rawProducts);
    const images = safeParseArray<ProductImage>(rawImages);

    const validProducts = products.filter((item) => text(item.slug));

    const filtered = validProducts.filter((item) => {
      const matchesSearch =
        !q ||
        normalize(item.title).includes(q) ||
        normalize(item.slug).includes(q) ||
        normalize(item.description).includes(q) ||
        normalize(item.short_description).includes(q) ||
        normalize(item.collection_slug).includes(q);

      const matchesStatus =
        !status || status === "all" || normalize(item.status) === status;

      const matchesCollection =
        !collection ||
        collection === "all" ||
        normalize(item.collection_slug) === collection;

      const matchesFeatured =
        !featured ||
        featured === "all" ||
        normalize(item.featured) === featured;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCollection &&
        matchesFeatured
      );
    });

    const total = validProducts.length;

    const published = validProducts.filter(
      (item) => normalize(item.status) === "published"
    ).length;

    const draft = validProducts.filter(
      (item) => normalize(item.status) === "draft"
    ).length;

    const noMainImage = validProducts.filter((item) => !text(item.image)).length;

    const noGallery = validProducts.filter((item) => {
      const slug = normalize(item.slug);
      return !images.some((img) => normalize(img.product_slug) === slug);
    }).length;

    const missingAltText = validProducts.filter((item) => {
      const slug = normalize(item.slug);
      const relatedImages = images.filter(
        (img) => normalize(img.product_slug) === slug
      );

      if (relatedImages.length === 0) return false;

      return relatedImages.some((img) => !text(img.alt_text));
    }).length;

    const lowImageCount = validProducts.filter((item) => {
      const slug = normalize(item.slug);
      const relatedImages = images.filter(
        (img) => normalize(img.product_slug) === slug
      );
      return relatedImages.length > 0 && relatedImages.length < 2;
    }).length;

    const totalFiltered = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
    const currentPage = Math.min(page, totalPages);

    const start = (currentPage - 1) * limit;
    const end = start + limit;

    const paginatedItems = filtered.slice(start, end).map(toProductItem);

    return NextResponse.json(
      {
        ok: true,
        items: paginatedItems,
        pagination: {
          page: currentPage,
          limit,
          total: totalFiltered,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        },
        stats: {
          total,
          onThisPage: paginatedItems.length,
          published,
          draft,
          noGallery,
          noMainImage,
          missingAltText,
          lowImageCount,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Admin products list failed.",
      },
      { status: 500 }
    );
  }
}