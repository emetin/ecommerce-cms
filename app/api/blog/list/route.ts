import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

type BlogRow = {
  id?: string | null;
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  content?: string | null;
  image_url?: string | null;
  image_file_id?: string | null;
  image_alt?: string | null;
  status?: string | null;
  featured?: boolean | string | null;
  published_at?: string | null;
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

function isTrue(value: unknown) {
  if (typeof value === "boolean") return value;
  return normalizeLower(value) === "true";
}

function toBlogItem(item: BlogRow) {
  return {
    id: normalizeText(item.id),
    title: normalizeText(item.title),
    slug: normalizeText(item.slug),
    excerpt: normalizeText(item.excerpt),
    content: normalizeText(item.content),

    image: normalizeText(item.image_url),
    image_url: normalizeText(item.image_url),
    image_file_id: normalizeText(item.image_file_id),
    image_alt: normalizeText(item.image_alt),
    image_uploaded_at: normalizeText(item.created_at),

    status: normalizeText(item.status),
    featured: isTrue(item.featured) ? "true" : "false",
    published_at: normalizeText(item.published_at),
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
      .from("blog")
      .select(
        `
        id,
        title,
        slug,
        excerpt,
        content,
        image_url,
        image_file_id,
        image_alt,
        status,
        featured,
        published_at,
        seo_title,
        seo_description,
        created_at,
        updated_at
      `
      )
      .order("updated_at", { ascending: false });

    if (statusParam) {
      query = query.eq("status", statusParam);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const items = ((data || []) as BlogRow[])
      .filter((item) => item && normalizeText(item.slug))
      .map(toBlogItem);

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
          error instanceof Error ? error.message : "Failed to fetch blog posts.",
      },
      { status: 500 }
    );
  }
}