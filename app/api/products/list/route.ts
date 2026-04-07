import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type ProductItem = Record<string, string>;

const ALLOWED_STATUS = ["published", "draft", "archived"] as const;
const SHEET_NAME = "products";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toListItem(item: ProductItem) {
  return {
    id: item.id || "",
    title: item.title || "",
    slug: item.slug || "",
    image: item.image || "",
    collection_slug: item.collection_slug || "",
    status: item.status || "",
    featured: item.featured || "false",
    updated_at: item.updated_at || "",
    short_description: item.short_description || "",
  };
}

function matchesQuery(item: ProductItem, query: string) {
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

function compareByUpdatedAtDesc(a: ProductItem, b: ProductItem) {
  const aUpdated = normalizeText(a.updated_at);
  const bUpdated = normalizeText(b.updated_at);
  return bUpdated.localeCompare(aUpdated);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const statusParam = normalizeLower(searchParams.get("status"));
    const queryParam = normalizeLower(searchParams.get("q"));

    const limitParam = Number(searchParams.get("limit") || "50");
    const pageParam = Number(searchParams.get("page") || "1");

    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 200)
        : 50;

    const page =
      Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    if (
      statusParam &&
      !ALLOWED_STATUS.includes(
        statusParam as (typeof ALLOWED_STATUS)[number]
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid status filter." },
        { status: 400 }
      );
    }

    const products = (await getSheetData(SHEET_NAME, {
      ttlSeconds: 1800,
    })) as ProductItem[];

    let items = products.filter((item) => item && normalizeLower(item.slug));

    if (statusParam) {
      items = items.filter(
        (item) => normalizeLower(item.status) === statusParam
      );
    }

    if (queryParam) {
      items = items.filter((item) => matchesQuery(item, queryParam));
    }

    items.sort(compareByUpdatedAtDesc);

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const end = start + limit;

    const paginatedItems = items.slice(start, end).map(toListItem);

    return NextResponse.json(
      {
        ok: true,
        total,
        page: safePage,
        limit,
        totalPages,
        items: paginatedItems,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch products.",
      },
      { status: 500 }
    );
  }
}