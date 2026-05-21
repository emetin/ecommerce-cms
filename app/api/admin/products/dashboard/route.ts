import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../../lib/supabase/admin";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSessionToken,
} from "../../../../../lib/admin-auth";

type ProductRecord = {
  id?: string | null;
  title?: string | null;
  slug?: string | null;
  image_url?: string | null;
  image_file_id?: string | null;
  image_alt?: string | null;
  primary_collection_id?: string | null;
  status?: string | null;
  featured?: boolean | string | null;
  updated_at?: string | null;
  created_at?: string | null;
  short_description?: string | null;
  vendor?: string | null;
  product_category?: string | null;
  product_type?: string | null;
  tags?: string | null;
  product_images?: ProductImageRecord[] | null;
  product_collections?: ProductCollectionRecord[] | null;
};

type ProductImageRecord = {
  id?: string | null;
  product_id?: string | null;
  image_url?: string | null;
  image_file_id?: string | null;
  alt_text?: string | null;
  sort_order?: number | string | null;
  is_main?: boolean | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProductCollectionRecord = {
  id?: string | null;
  product_id?: string | null;
  collection_id?: string | null;
  collections?: {
    id?: string | null;
    title?: string | null;
    slug?: string | null;
  } | null;
};

const ALLOWED_STATUS = ["published", "draft", "archived"] as const;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isTrue(value: unknown) {
  if (typeof value === "boolean") return value;
  return normalizeLower(value) === "true";
}

function toSafeOrder(value: unknown) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : 999999;
}

function parseCookieValue(cookieHeader: string, cookieName: string) {
  const escapedCookieName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${escapedCookieName}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeLimit(value: unknown) {
  const number = Number(value || DEFAULT_LIMIT);

  if (!Number.isFinite(number) || number <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(number), MAX_LIMIT);
}

function normalizePage(value: unknown) {
  const number = Number(value || 1);

  if (!Number.isFinite(number) || number <= 0) {
    return 1;
  }

  return Math.floor(number);
}

function sortImages(images: ProductImageRecord[]) {
  return [...images].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    const orderDiff = toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return normalizeText(a.created_at).localeCompare(normalizeText(b.created_at));
  });
}

function getCollectionSlug(product: ProductRecord) {
  const firstCollection = product.product_collections?.[0]?.collections;

  return normalizeText(firstCollection?.slug);
}

function getGalleryStateFromImages(
  product: ProductRecord,
  images: ProductImageRecord[]
) {
  const sortedImages = sortImages(images);
  const mainImage = sortedImages.find((item) => isTrue(item.is_main)) || null;
  const firstImage = sortedImages[0] || null;

  const altCount = sortedImages.filter((item) =>
    normalizeText(item.alt_text)
  ).length;

  const primaryImage =
    normalizeText(mainImage?.image_url) ||
    normalizeText(firstImage?.image_url) ||
    normalizeText(product.image_url);

  const issues: string[] = [];

  if (sortedImages.length === 0) {
    issues.push("No gallery images");
  }

  if (sortedImages.length > 0 && !mainImage) {
    issues.push("No main image");
  }

  if (sortedImages.length > 0 && altCount < sortedImages.length) {
    issues.push("Missing alt text");
  }

  if (sortedImages.length > 0 && sortedImages.length < 3) {
    issues.push("Low image count");
  }

  let score = 0;

  if (sortedImages.length > 0) score += 35;
  if (mainImage) score += 35;
  if (sortedImages.length >= 3) score += 15;
  if (sortedImages.length > 0 && altCount === sortedImages.length) score += 15;

  return {
    imageCount: sortedImages.length,
    mainImageExists: Boolean(mainImage),
    altCount,
    primaryImage,
    issues,
    score,
  };
}

function toDashboardItem(product: ProductRecord) {
  const images = product.product_images || [];
  const gallery = getGalleryStateFromImages(product, images);

  return {
    id: normalizeText(product.id),
    title: normalizeText(product.title),
    slug: normalizeText(product.slug),

    image: normalizeText(product.image_url),
    image_url: normalizeText(product.image_url),
    image_file_id: normalizeText(product.image_file_id),
    image_alt: normalizeText(product.image_alt),

    collection_slug: getCollectionSlug(product),
    status: normalizeText(product.status),
    featured: isTrue(product.featured) ? "true" : "false",
    updated_at: normalizeText(product.updated_at),
    created_at: normalizeText(product.created_at),
    short_description: normalizeText(product.short_description),

    vendor: normalizeText(product.vendor),
    product_category: normalizeText(product.product_category),
    product_type: normalizeText(product.product_type),
    tags: normalizeText(product.tags),

    gallery_image_count: gallery.imageCount,
    gallery_main_image_exists: gallery.mainImageExists,
    gallery_alt_count: gallery.altCount,
    gallery_primary_image: gallery.primaryImage,
    gallery_issues: gallery.issues,
    gallery_score: gallery.score,
  };
}

function getGallerySummary(items: ReturnType<typeof toDashboardItem>[]) {
  return items.reduce(
    (acc, item) => {
      if (item.gallery_image_count === 0) {
        acc.missingGallery += 1;
      }

      if (item.gallery_image_count > 0 && !item.gallery_main_image_exists) {
        acc.missingMainImage += 1;
      }

      if (
        item.gallery_image_count > 0 &&
        item.gallery_alt_count < item.gallery_image_count
      ) {
        acc.missingAltText += 1;
      }

      if (item.gallery_image_count > 0 && item.gallery_image_count < 3) {
        acc.lowImageCount += 1;
      }

      return acc;
    },
    {
      missingGallery: 0,
      missingMainImage: 0,
      missingAltText: 0,
      lowImageCount: 0,
    }
  );
}

async function getStatusSummary() {
  const supabase = createSupabaseAdminClient();

  const { count: publishedCount, error: publishedError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  if (publishedError) {
    throw new Error(publishedError.message);
  }

  const { count: draftCount, error: draftError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft");

  if (draftError) {
    throw new Error(draftError.message);
  }

  return {
    publishedCount: publishedCount || 0,
    draftCount: draftCount || 0,
  };
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseCookieValue(cookieHeader, ADMIN_COOKIE_NAME);
    const isAdmin = await verifyAdminSessionToken(token);

    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const statusParam = normalizeLower(searchParams.get("status"));
    const queryParam = normalizeText(searchParams.get("q"));

    const limit = normalizeLimit(searchParams.get("limit"));
    const page = normalizePage(searchParams.get("page"));

    if (
      statusParam &&
      !ALLOWED_STATUS.includes(statusParam as (typeof ALLOWED_STATUS)[number])
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid status filter." },
        { status: 400 }
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = createSupabaseAdminClient();

    let productsQuery = supabase
      .from("products")
      .select(
        `
        id,
        title,
        slug,
        image_url,
        image_file_id,
        image_alt,
        primary_collection_id,
        status,
        featured,
        updated_at,
        created_at,
        short_description,
        vendor,
        product_category,
        product_type,
        tags,
        product_images (
          id,
          product_id,
          image_url,
          image_file_id,
          alt_text,
          sort_order,
          is_main,
          created_at,
          updated_at
        ),
        product_collections (
          id,
          product_id,
          collection_id,
          collections (
            id,
            title,
            slug
          )
        )
      `,
        { count: "exact" }
      )
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (statusParam) {
      productsQuery = productsQuery.eq("status", statusParam);
    }

    if (queryParam) {
      const safeQuery = queryParam.replace(/[%]/g, "");

      productsQuery = productsQuery.or(
        [
          `title.ilike.%${safeQuery}%`,
          `slug.ilike.%${safeQuery}%`,
          `short_description.ilike.%${safeQuery}%`,
          `vendor.ilike.%${safeQuery}%`,
          `product_type.ilike.%${safeQuery}%`,
          `product_category.ilike.%${safeQuery}%`,
          `tags.ilike.%${safeQuery}%`,
        ].join(",")
      );
    }

    const [{ data, count, error }, basicSummary] = await Promise.all([
      productsQuery,
      getStatusSummary(),
    ]);

    if (error) {
      throw new Error(error.message);
    }

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);

    const items = ((data || []) as ProductRecord[]).map(toDashboardItem);
    const gallerySummary = getGallerySummary(items);

    return NextResponse.json(
      {
        ok: true,
        total,
        page: safePage,
        limit,
        totalPages,
        items,
        summary: {
          ...basicSummary,
          ...gallerySummary,
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
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
            : "Failed to load product dashboard.",
      },
      { status: 500 }
    );
  }
}