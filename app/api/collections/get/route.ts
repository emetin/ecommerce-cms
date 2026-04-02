import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type CollectionItem = Record<string, string>;

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = normalizeLower(searchParams.get("slug"));

    if (!slug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Slug is required.",
        },
        { status: 400 }
      );
    }

    const items = (await getSheetData("collections", {
      forceFresh: true,
      ttlSeconds: 0,
    })) as CollectionItem[];

    const item =
      items.find((entry) => normalizeLower(entry.slug) === slug) || null;

    if (!item) {
      return NextResponse.json(
        {
          ok: false,
          error: "Collection not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        item,
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
            : "Failed to fetch collection.",
      },
      { status: 500 }
    );
  }
}