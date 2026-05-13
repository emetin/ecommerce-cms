import { NextResponse } from "next/server";
import { getSheetData } from "../../../../../lib/sheets";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

type ProductRecord = Record<string, string>;

type ProductImageRecord = {
  id?: string;
  product_slug?: string;
  image_url?: string;
  image_file_id?: string;
  image_uploaded_at?: string;
  sort_order?: string;
  alt_text?: string;
  is_main?: string;
  created_at?: string;
  updated_at?: string;
};

const ALLOWED_STATUS = ["published", "draft", "archived"] as const;
const PRODUCTS_SHEET_NAME = "products";
const PRODUCT_IMAGES_SHEET_NAME = "product_images";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isTrue(value: unknown) {
  return normalizeLower(value) === "true";
}

function toSafeOrder(value: unknown) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : 999999;
}

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function compareByUpdatedAtDesc(a: ProductRecord, b: ProductRecord) {
  const aUpdated = normalizeText(a.updated_at);
  const bUpdated = normalizeText(b.updated_at);

  return bUpdated.localeCompare(aUpdated);
}

function matchesQuery(item: ProductRecord, query: string) {
  if (!query) return true;

  const title = normalizeLower(item.title);
  const slug = normalizeLower(item.slug);
  const collectionSlug = normalizeLower(item.collection_slug);
  const shortDescription = normalizeLower(item.short_description);

  return (
    title.includes(query) ||
    slug.includes(query) ||
    collectionSlug.includes(query) ||
    shortDescription.includes(query)
  );
}

function sortImages(images: ProductImageRecord[]) {
  return [...images].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    return toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
  });
}

function buildImageMap(images: ProductImageRecord[]) {
  const map = new Map<string, ProductImageRecord[]>();

  images.forEach((image) => {
    const slug = normalizeLower(image.product_slug);

    if (!slug) return;

    if (!map.has(slug)) {
      map.set(slug, []);
    }

    map.get(slug)!.push(image);
  });

  for (const [slug, currentImages] of map.entries()) {
    map.set(slug, sortImages(currentImages));
  }

  return map;
}

function buildGalleryState(
  product: ProductRecord,
  imageMap: Map<string, ProductImageRecord[]>
) {
  const slug = normalizeLower(product.slug);
  const images = imageMap.get(slug) || [];

  const mainImage = images.find((item) => isTrue(item.is_main)) || null;
  const firstImage = images[0] || null;
  const altCount = images.filter((item) => normalizeText(item.alt_text)).length;

  const primaryImage =
    normalizeText(mainImage?.image_url) ||
    normalizeText(firstImage?.image_url) ||
    normalizeText(product.image);

  const issues: string[] = [];

  if (images.length === 0) {
    issues.push("No gallery images");
  }

  if (images.length > 0 && !mainImage) {
    issues.push("No main image");
  }

  if (images.length > 0 && altCount < images.length) {
    issues.push("Missing alt text");
  }

  if (images.length > 0 && images.length < 3) {
    issues.push("Low image count");
  }

  let score = 0;

  if (images.length > 0) score += 35;
  if (mainImage) score += 35;
  if (images.length >= 3) score += 15;
  if (images.length > 0 && altCount === images.length) score += 15;

  return {
    imageCount: images.length,
    mainImageExists: Boolean(mainImage),
    altCount,
    primaryImage,
    issues,
    score,
  };
}

function toDashboardItem(
  product: ProductRecord,
  imageMap: Map<string, ProductImageRecord[]>
) {
  const gallery = buildGalleryState(product, imageMap);

  return {
    id: normalizeText(product.id),
    title: normalizeText(product.title),
    slug: normalizeText(product.slug),
    image: normalizeText(product.image),
    collection_slug: normalizeText(product.collection_slug),
    status: normalizeText(product.status),
    featured: normalizeText(product.featured || "false"),
    updated_at: normalizeText(product.updated_at),
    short_description: normalizeText(product.short_description),

    gallery_image_count: gallery.imageCount,
    gallery_main_image_exists: gallery.mainImageExists,
    gallery_alt_count: gallery.altCount,
    gallery_primary_image: gallery.primaryImage,
    gallery_issues: gallery.issues,
    gallery_score: gallery.score,
  };
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseAdminTokenFromCookie(cookieHeader);
    const isAdmin = await verifyAdminSessionToken(token);

    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const statusParam = normalizeLower(searchParams.get("status"));
    const queryParam = normalizeLower(searchParams.get("q"));

    const limitParam = Number(searchParams.get("limit") || "50");
    const pageParam = Number(searchParams.get("page") || "1");

    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 200)
        : 50;

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    if (
      statusParam &&
      !ALLOWED_STATUS.includes(statusParam as (typeof ALLOWED_STATUS)[number])
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid status filter." },
        { status: 400 }
      );
    }

    const [products, productImages] = await Promise.all([
      getSheetData(PRODUCTS_SHEET_NAME, {
        ttlSeconds: 60,
      }) as Promise<ProductRecord[]>,
      getSheetData(PRODUCT_IMAGES_SHEET_NAME, {
        ttlSeconds: 60,
      }) as Promise<ProductImageRecord[]>,
    ]);

    const imageMap = buildImageMap(productImages);

    let filteredProducts = products.filter(
      (item) => item && normalizeLower(item.slug)
    );

    if (statusParam) {
      filteredProducts = filteredProducts.filter(
        (item) => normalizeLower(item.status) === statusParam
      );
    }

    if (queryParam) {
      filteredProducts = filteredProducts.filter((item) =>
        matchesQuery(item, queryParam)
      );
    }

    filteredProducts.sort(compareByUpdatedAtDesc);

    const total = filteredProducts.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const end = start + limit;

    const paginatedProducts = filteredProducts.slice(start, end);
    const items = paginatedProducts.map((product) =>
      toDashboardItem(product, imageMap)
    );

    const summary = items.reduce(
      (acc, item) => {
        const status = normalizeLower(item.status);

        if (status === "published") {
          acc.publishedCount += 1;
        }

        if (status === "draft") {
          acc.draftCount += 1;
        }

        if (item.gallery_image_count === 0) {
          acc.missingGallery += 1;
        }

        if (
          item.gallery_image_count > 0 &&
          !item.gallery_main_image_exists
        ) {
          acc.missingMainImage += 1;
        }

        if (
          item.gallery_image_count > 0 &&
          item.gallery_alt_count < item.gallery_image_count
        ) {
          acc.missingAltText += 1;
        }

        if (
          item.gallery_image_count > 0 &&
          item.gallery_image_count < 3
        ) {
          acc.lowImageCount += 1;
        }

        return acc;
      },
      {
        publishedCount: 0,
        draftCount: 0,
        missingGallery: 0,
        missingMainImage: 0,
        missingAltText: 0,
        lowImageCount: 0,
      }
    );

    return NextResponse.json(
      {
        ok: true,
        total,
        page: safePage,
        limit,
        totalPages,
        items,
        summary,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
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