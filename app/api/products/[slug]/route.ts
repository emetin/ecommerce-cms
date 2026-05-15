import { NextResponse } from "next/server";
import { getProductBySlug } from "../../../../lib/db/products";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const slug = normalizeText(params.slug);

    if (!slug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product slug is required.",
        },
        { status: 400 }
      );
    }

    const product = await getProductBySlug({ slug });

    if (!product) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        product,
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
          error instanceof Error ? error.message : "Failed to fetch product.",
      },
      { status: 500 }
    );
  }
}