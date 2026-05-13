import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSessionToken,
} from "../../../../../lib/admin-auth";
import { getSheetData } from "../../../../../lib/sheets";

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

const PRODUCTS_SHEET_NAME = "products";
const PRODUCT_IMAGES_SHEET_NAME = "product_images";
const IMAGE_MANAGER_TTL_SECONDS = 300;

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

function parseCookieValue(cookieHeader: string, cookieName: string) {
  const escapedCookieName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${escapedCookieName}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function sortImages(items: ProductImageRecord[]) {
  return [...items].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    return toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
  });
}

function toProductItem(item: ProductRecord) {
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
    featured: normalizeText(item.featured || "false"),
    seo_title: normalizeText(item.seo_title),
    seo_description: normalizeText(item.seo_description),
    created_at: normalizeText(item.created_at),
    updated_at: normalizeText(item.updated_at),
    vendor: normalizeText(item.vendor),
    product_category: normalizeText(item.product_category),
    type: normalizeText(item.type),
    tags: normalizeText(item.tags),
  };
}

function toImageItem(item: ProductImageRecord) {
  return {
    id: normalizeText(item.id),
    product_slug: normalizeText(item.product_slug),
    image_url: normalizeText(item.image_url),
    image_file_id: normalizeText(item.image_file_id),
    image_uploaded_at: normalizeText(item.image_uploaded_at),
    sort_order: normalizeText(item.sort_order),
    alt_text: normalizeText(item.alt_text),
    is_main: normalizeText(item.is_main || "false"),
    created_at: normalizeText(item.created_at),
    updated_at: normalizeText(item.updated_at),
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
    const slug = normalizeLower(searchParams.get("slug"));

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing product slug." },
        { status: 400 }
      );
    }

    const [products, productImages] = await Promise.all([
      getSheetData(PRODUCTS_SHEET_NAME, {
        forceFresh: false,
        ttlSeconds: IMAGE_MANAGER_TTL_SECONDS,
      }) as Promise<ProductRecord[]>,

      getSheetData(PRODUCT_IMAGES_SHEET_NAME, {
        forceFresh: false,
        ttlSeconds: IMAGE_MANAGER_TTL_SECONDS,
      }) as Promise<ProductImageRecord[]>,
    ]);

    const product =
      products.find((item) => normalizeLower(item.slug) === slug) || null;

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    const images = sortImages(
      productImages.filter((item) => normalizeLower(item.product_slug) === slug)
    ).map(toImageItem);

    return NextResponse.json(
      {
        ok: true,
        product: toProductItem(product),
        images,
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
            : "Failed to load product image manager data.",
      },
      { status: 500 }
    );
  }
}