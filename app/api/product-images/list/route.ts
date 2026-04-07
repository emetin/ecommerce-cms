import { NextResponse } from "next/server";
import { findSheetItemsByField, getSheetData } from "../../../../lib/sheets";

type ProductImageItem = Record<string, string>;

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

function sortImages(items: ProductImageItem[]) {
  return [...items].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    const byOrder = toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
    if (byOrder !== 0) return byOrder;

    return normalizeText(a.id).localeCompare(normalizeText(b.id));
  });
}

function filterValidImages(items: ProductImageItem[]) {
  return items.filter((item) => item && normalizeText(item.id));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productSlug = normalizeLower(searchParams.get("product_slug"));

    let items: ProductImageItem[] = [];

    if (productSlug) {
      items = (await findSheetItemsByField<ProductImageItem>(
        "product_images",
        "product_slug",
        productSlug,
        { ttlSeconds: 1800 }
      )) as ProductImageItem[];
    } else {
      items = (await getSheetData("product_images", {
        ttlSeconds: 1800,
      })) as ProductImageItem[];
    }

    const sortedItems = sortImages(filterValidImages(items));

    return NextResponse.json(
      {
        ok: true,
        total: sortedItems.length,
        items: sortedItems,
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
          error instanceof Error
            ? error.message
            : "Failed to fetch product images.",
      },
      { status: 500 }
    );
  }
}