import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type ProductItem = Record<string, string>;

const SHEET_NAME = "products";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const slug = String(searchParams.get("slug") || "")
      .trim()
      .toLowerCase();

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing product slug." },
        { status: 400 }
      );
    }

    const products = (await getSheetData(SHEET_NAME)) as ProductItem[];

    const item =
      products.find(
        (product) =>
          String(product?.slug || "").trim().toLowerCase() === slug
      ) || null;

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      item,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load product.",
      },
      { status: 500 }
    );
  }
}