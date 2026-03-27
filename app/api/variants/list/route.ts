import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type VariantItem = Record<string, string>;

const ALLOWED_STATUS = ["published", "draft", "archived"];
const SHEET_NAME = "product_variants";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const productSlug = String(searchParams.get("product_slug") || "")
      .trim()
      .toLowerCase();

    const statusParam = String(searchParams.get("status") || "")
      .trim()
      .toLowerCase();

    const variants = (await getSheetData(SHEET_NAME, {
      ttlSeconds: 300,
    })) as VariantItem[];

    let items = variants.filter((item) => item && item.id);

    if (productSlug) {
      items = items.filter(
        (item) =>
          String(item.product_slug || "").trim().toLowerCase() === productSlug
      );
    }

    if (statusParam) {
      if (!ALLOWED_STATUS.includes(statusParam)) {
        return NextResponse.json(
          { ok: false, error: "Invalid status filter." },
          { status: 400 }
        );
      }

      items = items.filter(
        (item) =>
          String(item.status || "").trim().toLowerCase() === statusParam
      );
    }

    items = items.sort((a, b) => {
      const aCreated = String(a.created_at || "");
      const bCreated = String(b.created_at || "");
      return aCreated.localeCompare(bCreated);
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
          error instanceof Error ? error.message : "Failed to fetch variants.",
      },
      { status: 500 }
    );
  }
}