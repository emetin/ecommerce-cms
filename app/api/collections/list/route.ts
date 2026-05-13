import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type CollectionItem = Record<string, string>;

const ALLOWED_STATUS = ["published", "draft", "archived"];
const COLLECTIONS_TTL_SECONDS = 300;

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toCollectionItem(item: CollectionItem) {
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = normalizeLower(searchParams.get("status"));

    if (statusParam && !ALLOWED_STATUS.includes(statusParam)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid status filter.",
        },
        { status: 400 }
      );
    }

    const collections = (await getSheetData("collections", {
      ttlSeconds: COLLECTIONS_TTL_SECONDS,
    })) as CollectionItem[];

    let items = collections.filter((item) => item && normalizeText(item.slug));

    if (statusParam) {
      items = items.filter((item) => normalizeLower(item.status) === statusParam);
    }

    items = items
      .map(toCollectionItem)
      .sort((a, b) => normalizeText(a.title).localeCompare(normalizeText(b.title)));

    return NextResponse.json(
      {
        ok: true,
        total: items.length,
        items,
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
          error instanceof Error ? error.message : "Failed to fetch collections.",
      },
      { status: 500 }
    );
  }
}