import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

type ProductImageRow = {
  id?: string;
  product_id?: string | null;
  image_url?: string | null;
  image_file_id?: string | null;
  alt_text?: string | null;
  sort_order?: number | string | null;
  is_main?: boolean | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  products?: {
    slug?: string | null;
  } | null;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isTrue(value: unknown) {
  if (typeof value === "boolean") return value;
  return normalizeLower(value) === "true";
}

function toSafeOrder(value: unknown) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : 999999;
}

function mapImage(row: ProductImageRow) {
  const productSlug = normalizeText(row.products?.slug);

  return {
    id: normalizeText(row.id),
    product_id: normalizeText(row.product_id),
    product_slug: productSlug,
    image_url: normalizeText(row.image_url),
    image_file_id: normalizeText(row.image_file_id),
    image_uploaded_at: normalizeText(row.created_at),
    sort_order: String(toSafeOrder(row.sort_order)),
    alt_text: normalizeText(row.alt_text),
    is_main: isTrue(row.is_main) ? "true" : "false",
    created_at: normalizeText(row.created_at),
    updated_at: normalizeText(row.updated_at),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productSlug = normalizeLower(searchParams.get("product_slug"));

    const supabase = createSupabaseAdminClient();

    let productId = "";

    if (productSlug) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, slug")
        .eq("slug", productSlug)
        .maybeSingle();

      if (productError) {
        throw new Error(productError.message);
      }

      if (!product) {
        return NextResponse.json(
          {
            ok: true,
            items: [],
          },
          {
            headers: {
              "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
            },
          }
        );
      }

      productId = normalizeText(product.id);
    }

    let query = supabase
      .from("product_images")
      .select(
        `
        id,
        product_id,
        image_url,
        image_file_id,
        alt_text,
        sort_order,
        is_main,
        created_at,
        updated_at,
        products (
          slug
        )
      `
      )
      .order("is_main", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const items = ((data || []) as ProductImageRow[])
      .map(mapImage)
      .sort((a, b) => {
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
        items,
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
            : "Failed to list product images.",
      },
      { status: 500 }
    );
  }
}