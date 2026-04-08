import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type ProductImageRecord = {
  id?: string;
  product_slug?: string;
  image_url?: string;
  image_file_id?: string;
  image_uploaded_at?: string;
  sort_order?: string;
  alt_text?: string;
  is_main?: string;
  created_at?: string;
  updated_at?: string;
};

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

    const items = (await getSheetData("product_images")) as ProductImageRecord[];

    const filtered = items
      .filter((item) => {
        if (!productSlug) return true;

        return (
          String(item.product_slug || "").trim().toLowerCase() === productSlug
        );
      })
      .sort((a, b) => {
        const aMain = isTrue(a.is_main);
        const bMain = isTrue(b.is_main);

        if (aMain !== bMain) {
          return aMain ? -1 : 1;
        }

        return toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
      });

    return NextResponse.json({
      ok: true,
      items: filtered,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to list product images.",
      },
      { status: 500 }
    );
  }
}