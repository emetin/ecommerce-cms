import { NextResponse } from "next/server";
import {
  getSheetData,
  getSheetHeaders,
  updateSheetObjectBySlug,
} from "../../../../lib/sheets";

type ProductRecord = Record<string, string>;

const SHEET_NAME = "products";

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function hasOwn(obj: unknown, key: string) {
  return !!obj && typeof obj === "object" && key in obj;
}

function normalizeStatus(value: unknown, fallback = "draft") {
  const normalized = normalizeLower(value || fallback);

  if (normalized === "published") return "published";
  if (normalized === "draft") return "draft";
  if (normalized === "archived") return "archived";
  if (normalized === "active") return "published";

  return fallback;
}

function normalizeBool(value: unknown, fallback = "false") {
  const normalized = normalizeLower(value || fallback);
  return normalized === "true" ? "true" : "false";
}

function mapLogicalFieldToActualHeader(
  logicalField: string,
  headers: string[]
): string | null {
  const headerMap: Record<string, string[]> = {
    title: ["title"],
    slug: ["slug"],
    description: ["description"],
    short_description: ["short_description", "short description"],
    image: ["image"],
    gallery: ["gallery"],
    collection_slug: ["collection_slug", "collection"],
    status: ["status"],
    featured: ["featured"],
    seo_title: ["seo_title", "seo title"],
    seo_description: ["seo_description", "seo description"],
    vendor: ["vendor"],
    product_category: ["product_category", "category", "product category"],
    type: ["type"],
    tags: ["tags"],
    updated_at: ["updated_at", "updated at"],
  };

  const normalizedHeaders = headers.map((header) => normalizeLower(header));
  const candidates = headerMap[logicalField] || [logicalField];

  for (const candidate of candidates) {
    const index = normalizedHeaders.findIndex(
      (header) => header === normalizeLower(candidate)
    );

    if (index !== -1) {
      return headers[index];
    }
  }

  return null;
}

function buildMappedUpdates(
  logicalUpdates: Record<string, string>,
  headers: string[]
) {
  const actualUpdates: Record<string, string> = {};

  for (const [logicalField, value] of Object.entries(logicalUpdates)) {
    const actualHeader = mapLogicalFieldToActualHeader(logicalField, headers);

    if (actualHeader) {
      actualUpdates[actualHeader] = normalizeText(value);
    }
  }

  return actualUpdates;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const slug = normalizeLower(body?.slug);

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Slug is required." },
        { status: 400 }
      );
    }

    const [items, headers] = await Promise.all([
      getSheetData(SHEET_NAME, {
        forceFresh: true,
        ttlSeconds: 0,
      }) as Promise<ProductRecord[]>,
      getSheetHeaders(SHEET_NAME, {
        forceFresh: true,
        ttlSeconds: 0,
      }),
    ]);

    const current =
      items.find((item) => normalizeLower(item.slug) === slug) || null;

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    const nextTitle = hasOwn(body, "title")
      ? normalizeText(body.title)
      : normalizeText(current.title);

    if (!nextTitle) {
      return NextResponse.json(
        { ok: false, error: "Title is required." },
        { status: 400 }
      );
    }

    const nextStatus = hasOwn(body, "status")
      ? normalizeStatus(body.status, normalizeStatus(current.status, "draft"))
      : normalizeStatus(current.status, "draft");

    const nextFeatured = hasOwn(body, "featured")
      ? normalizeBool(body.featured, normalizeBool(current.featured, "false"))
      : normalizeBool(current.featured, "false");

    const nextDescription = hasOwn(body, "description")
      ? normalizeText(body.description)
      : normalizeText(current.description);

    const nextShortDescription = hasOwn(body, "short_description")
      ? normalizeText(body.short_description)
      : normalizeText(current.short_description);

    const nextImage = hasOwn(body, "image")
      ? normalizeText(body.image)
      : normalizeText(current.image);

    const nextGallery = hasOwn(body, "gallery")
      ? normalizeText(body.gallery)
      : normalizeText(current.gallery);

    const nextCollectionSlug = hasOwn(body, "collection_slug")
      ? normalizeText(body.collection_slug)
      : normalizeText(current.collection_slug);

    const nextSeoTitle = hasOwn(body, "seo_title")
      ? normalizeText(body.seo_title)
      : normalizeText(current.seo_title);

    const nextSeoDescription = hasOwn(body, "seo_description")
      ? normalizeText(body.seo_description)
      : normalizeText(current.seo_description);

    const nextVendor = hasOwn(body, "vendor")
      ? normalizeText(body.vendor)
      : normalizeText(current.vendor);

    const nextProductCategory = hasOwn(body, "product_category")
      ? normalizeText(body.product_category)
      : normalizeText(current.product_category);

    const nextType = hasOwn(body, "type")
      ? normalizeText(body.type)
      : normalizeText(current.type);

    const nextTags = hasOwn(body, "tags")
      ? normalizeText(body.tags)
      : normalizeText(current.tags);

    const logicalUpdates: Record<string, string> = {
      title: nextTitle,
      description: nextDescription,
      short_description: nextShortDescription,
      image: nextImage,
      gallery: nextGallery,
      collection_slug: nextCollectionSlug,
      status: nextStatus,
      featured: nextFeatured,
      seo_title: nextSeoTitle || nextTitle,
      seo_description:
        nextSeoDescription || nextShortDescription || nextDescription,
      vendor: nextVendor,
      product_category: nextProductCategory,
      type: nextType,
      tags: nextTags,
      updated_at: new Date().toISOString(),
    };

    const actualUpdates = buildMappedUpdates(logicalUpdates, headers);

    if (!Object.keys(actualUpdates).length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No matching headers were found in the products sheet for update.",
        },
        { status: 400 }
      );
    }

    await updateSheetObjectBySlug(SHEET_NAME, slug, actualUpdates);

    return NextResponse.json({
      ok: true,
      message: "Product updated successfully.",
      item: {
        ...current,
        ...logicalUpdates,
        slug,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to update product.",
      },
      { status: 500 }
    );
  }
}