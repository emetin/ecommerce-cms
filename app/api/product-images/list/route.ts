import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type ProductImageItem = Record<string, string>;

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function isTrue(value: unknown) {
  return String(value || "").trim().toLowerCase() === "true";
}

function toSafeOrder(value: unknown) {
  const num = Number(String(value || "").trim());
  return Number.isFinite(num) ? num : 999999;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const productSlug = normalizeText(searchParams.get("product_slug")).toLowerCase();

    const images = (await getSheetData("product_images")) as ProductImageItem[];

    let items = images.filter((item) => item && normalizeText(item.id));

    if (productSlug) {
      items = items.filter(
        (item) =>
          normalizeText(item.product_slug).toLowerCase() === productSlug
      );
    }

    items = items.sort((a, b) => {
      const aMain = isTrue(a.is_main);
      const bMain = isTrue(b.is_main);

      if (aMain !== bMain) {
        return aMain ? -1 : 1;
      }

      return toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
    });

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