import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type ProductImageItem = Record<string, string>;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const productSlug = String(searchParams.get("product_slug") || "")
      .trim()
      .toLowerCase();

    const images = (await getSheetData("product_images")) as ProductImageItem[];

    let items = images.filter((item) => item && item.id);

    if (productSlug) {
      items = items.filter(
        (item) =>
          String(item.product_slug || "").trim().toLowerCase() === productSlug
      );
    }

    items = items.sort((a, b) => {
      const aMain = String(a.is_main || "").trim().toLowerCase() === "true";
      const bMain = String(b.is_main || "").trim().toLowerCase() === "true";

      if (aMain !== bMain) {
        return aMain ? -1 : 1;
      }

      const aOrder = Number(String(a.sort_order || "").trim());
      const bOrder = Number(String(b.sort_order || "").trim());

      const safeA = Number.isFinite(aOrder) ? aOrder : 999999;
      const safeB = Number.isFinite(bOrder) ? bOrder : 999999;

      return safeA - safeB;
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