import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type CollectionItem = Record<string, string>;

const ALLOWED_STATUS = ["published", "draft", "archived"];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const statusParam = normalizeLower(searchParams.get("status"));

    /*
      Performance fix:
      getSheetData already uses cache when forceFresh is not enabled.
      We keep the same behavior but explicitly set a 60-second TTL for clarity.
    */
    const collections = (await getSheetData("collections", {
      ttlSeconds: 60,
    })) as CollectionItem[];

    let items = collections.filter((item) => item && item.slug);

    if (statusParam) {
      if (!ALLOWED_STATUS.includes(statusParam)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid status filter.",
          },
          { status: 400 }
        );
      }

      items = items.filter(
        (item) => normalizeLower(item.status) === statusParam
      );
    }

    items = items.sort((a, b) =>
      normalizeText(a.title).localeCompare(normalizeText(b.title))
    );

    return NextResponse.json(
      {
        ok: true,
        total: items.length,
        items,
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
            : "Failed to fetch collections.",
      },
      { status: 500 }
    );
  }
}