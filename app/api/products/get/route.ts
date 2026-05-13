import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type ProductRecord = Record<string, string>;

const SHEET_NAME = "products";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = normalizeLower(searchParams.get("slug"));

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing product slug." },
        { status: 400 }
      );
    }

    /*
      Performance fix:
      Previously this endpoint used forceFresh: true and ttlSeconds: 0.
      That forced a fresh Google Sheets request on every product detail call.
      60 seconds cache keeps admin faster without changing the response shape.
      Sheet write operations already invalidate cache from lib/sheets.ts.
    */
    const products = (await getSheetData(SHEET_NAME, {
      ttlSeconds: 60,
    })) as ProductRecord[];

    const item =
      products.find((product) => normalizeLower(product.slug) === slug) || null;

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        item: toProductItem(item),
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
          error instanceof Error ? error.message : "Failed to load product.",
      },
      { status: 500 }
    );
  }
}