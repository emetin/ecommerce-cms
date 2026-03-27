import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type ProductItem = Record<string, string>;

const ALLOWED_STATUS = ["published", "draft", "archived"];
const SHEET_NAME = "Products";

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const statusParam = normalize(searchParams.get("status"));
    const queryParam = normalize(searchParams.get("q"));

    const limitParam = Number(searchParams.get("limit") || "50");
    const pageParam = Number(searchParams.get("page") || "1");

    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 200)
        : 50;

    const page =
      Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    const products = (await getSheetData(SHEET_NAME, {
      ttlSeconds: 300,
    })) as ProductItem[];

    let items = products.filter((item) => item && normalize(item.slug));

    if (statusParam) {
      if (!ALLOWED_STATUS.includes(statusParam)) {
        return NextResponse.json(
          { ok: false, error: "Invalid status filter." },
          { status: 400 }
        );
      }

      items = items.filter(
        (item) => normalize(item.status) === statusParam
      );
    }

    if (queryParam) {
      items = items.filter((item) => {
        const title = normalize(item.title);
        const slug = normalize(item.slug);
        const collectionSlug = normalize(item.collection_slug);
        const shortDescription = normalize(item.short_description);

        return (
          title.includes(queryParam) ||
          slug.includes(queryParam) ||
          collectionSlug.includes(queryParam) ||
          shortDescription.includes(queryParam)
        );
      });
    }

    items = items.sort((a, b) => {
      const aUpdated = String(a.updated_at || "");
      const bUpdated = String(b.updated_at || "");
      return bUpdated.localeCompare(aUpdated);
    });

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
          "Cache-Control": "no-store",
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