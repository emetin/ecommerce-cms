import { NextRequest, NextResponse } from "next/server";
import { buildCsvExport } from "../../../../lib/export/csv-export";
import { buildJsonExport } from "../../../../lib/export/json-export";
import { buildXmlExport } from "../../../../lib/export/xml-export";
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
  featured?: boolean | null;
  published_at?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const BLOG_EXPORT_HEADERS = [
  "id",
  "title",
  "slug",
  "excerpt",
  "content",
  "image",
  "image_url",
  "image_file_id",
  "image_alt",
  "status",
  "featured",
  "published_at",
  "seo_title",
  "seo_description",
  "created_at",
  "updated_at",
];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function boolToString(value: unknown) {
  return value === true ? "true" : "false";
}

function mapBlogForExport(item: BlogRow) {
  const image = normalizeText(item.image_url);

  return {
    id: normalizeText(item.id),
    title: normalizeText(item.title),
    slug: normalizeText(item.slug),
    excerpt: normalizeText(item.excerpt),
    content: normalizeText(item.content),
    image,
    image_url: image,
    image_file_id: normalizeText(item.image_file_id),
    image_alt: normalizeText(item.image_alt),
    status: normalizeText(item.status || "draft"),
    featured: boolToString(item.featured),
    published_at: normalizeText(item.published_at),
    seo_title: normalizeText(item.seo_title),
    seo_description: normalizeText(item.seo_description),
    created_at: normalizeText(item.created_at),
    updated_at: normalizeText(item.updated_at),
  };
}

async function getBlogExportData() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
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

  if (error) {
    throw new Error(error.message);
  }

  return {
    headers: BLOG_EXPORT_HEADERS,
    items: ((data || []) as BlogRow[]).map(mapBlogForExport),
    xmlRoot: "blogPosts",
    xmlItem: "post",
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = String(searchParams.get("format") || "csv")
      .trim()
      .toLowerCase();

    if (!["csv", "json", "xml"].includes(format)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid export format. Use "csv", "json", or "xml".',
        },
        { status: 400 }
      );
    }

    const { headers, items, xmlRoot, xmlItem } = await getBlogExportData();

    if (format === "json") {
      const content = buildJsonExport(items);

      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="blog.json"',
        },
      });
    }

    if (format === "xml") {
      const content = buildXmlExport(xmlRoot, xmlItem, headers, items);

      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": 'attachment; filename="blog.xml"',
        },
      });
    }

    const content = buildCsvExport(headers, items);

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="blog.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Export failed.",
      },
      { status: 500 }
    );
  }
}