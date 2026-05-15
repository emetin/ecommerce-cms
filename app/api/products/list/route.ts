import { NextResponse } from "next/server";
import { getProductsList } from "../../../../lib/db/products";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const status = normalizeLower(searchParams.get("status"));
    const q = normalizeText(searchParams.get("q"));

    const limitParam = Number(searchParams.get("limit") || "50");
    const pageParam = Number(searchParams.get("page") || "1");

    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 200)
        : 50;

    const page =
      Number.isFinite(pageParam) && pageParam > 0
        ? Math.floor(pageParam)
        : 1;

    const result = await getProductsList({
      status,
      q,
      page,
      limit,
    });

    return NextResponse.json(
      {
        ok: true,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        items: result.items,
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
            : "Failed to fetch products.",
      },
      { status: 500 }
    );
  }
}