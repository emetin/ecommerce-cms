import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productSlug = normalizeLower(searchParams.get("product_slug"));

    const images = (await getSheetData("product_images", {
      ttlSeconds: 300,
    })) as ProductImageItem[];

    let items = images.filter((item) => item && normalizeText(item.id));

    if (productSlug) {
      items = items.filter(
        (item) => normalizeLower(item.product_slug) === productSlug
      );
    }

    items = sortImages(items);

    return NextResponse.json(
      {
        ok: true,
        total: items.length,
        items,
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
            : "Failed to fetch product images.",
      },
      { status: 500 }
    );
  }
}