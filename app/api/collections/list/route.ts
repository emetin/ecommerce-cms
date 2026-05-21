import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

type CollectionRow = {
  id?: string | null;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  image_url?: string | null;
  image_file_id?: string | null;
  image_alt?: string | null;
  status?: string | null;
  sort_order?: number | string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const ALLOWED_STATUS = ["published", "draft", "archived"];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toSafeOrder(value: unknown) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : 999999;
}

function toCollectionItem(item: CollectionRow) {
  return {
    id: normalizeText(item.id),
    title: normalizeText(item.title),
    slug: normalizeText(item.slug),
    description: normalizeText(item.description),

    image: normalizeText(item.image_url),
    image_url: normalizeText(item.image_url),
    image_file_id: normalizeText(item.image_file_id),
    image_alt: normalizeText(item.image_alt),

    status: normalizeText(item.status),
    sort_order: String(toSafeOrder(item.sort_order)),
    seo_title: normalizeText(item.seo_title),
    seo_description: normalizeText(item.seo_description),
    created_at: normalizeText(item.created_at),
    updated_at: normalizeText(item.updated_at),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = normalizeLower(searchParams.get("status"));

    if (statusParam && !ALLOWED_STATUS.includes(statusParam)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid status filter.",
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from("collections")
      .select(
        `
        id,
        title,
        slug,
        description,
        image_url,
        image_file_id,
        image_alt,
        status,
        sort_order,
        seo_title,
        seo_description,
        created_at,
        updated_at
      `
      )
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (statusParam) {
      query = query.eq("status", statusParam);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const items = ((data || []) as CollectionRow[])
      .filter((item) => item && normalizeText(item.slug))
      .map(toCollectionItem);

    return NextResponse.json(
      {
        ok: true,
        total: items.length,
        items,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch collections.",
      },
      { status: 500 }
    );
  }
}