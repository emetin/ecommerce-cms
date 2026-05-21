import { NextRequest, NextResponse } from "next/server";
import { buildCsvExport } from "../../../../lib/export/csv-export";
import { buildJsonExport } from "../../../../lib/export/json-export";
import { buildXmlExport } from "../../../../lib/export/xml-export";
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

const COLLECTION_EXPORT_HEADERS = [
  "id",
  "title",
  "slug",
  "description",
  "image",
  "image_url",
  "image_file_id",
  "image_alt",
  "status",
  "sort_order",
  "seo_title",
  "seo_description",
  "created_at",
  "updated_at",
];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function mapCollectionForExport(item: CollectionRow) {
  const image = normalizeText(item.image_url);

  return {
    id: normalizeText(item.id),
    title: normalizeText(item.title),
    slug: normalizeText(item.slug),
    description: normalizeText(item.description),
    image,
    image_url: image,
    image_file_id: normalizeText(item.image_file_id),
    image_alt: normalizeText(item.image_alt),
    status: normalizeText(item.status || "draft"),
    sort_order: normalizeText(item.sort_order),
    seo_title: normalizeText(item.seo_title),
    seo_description: normalizeText(item.seo_description),
    created_at: normalizeText(item.created_at),
    updated_at: normalizeText(item.updated_at),
  };
}

async function getCollectionsExportData() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
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

  if (error) {
    throw new Error(error.message);
  }

  return {
    headers: COLLECTION_EXPORT_HEADERS,
    items: ((data || []) as CollectionRow[]).map(mapCollectionForExport),
    xmlRoot: "collections",
    xmlItem: "collection",
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

    const { headers, items, xmlRoot, xmlItem } =
      await getCollectionsExportData();

    if (format === "json") {
      const content = buildJsonExport(items);

      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="collections.json"',
        },
      });
    }

    if (format === "xml") {
      const content = buildXmlExport(xmlRoot, xmlItem, headers, items);

      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": 'attachment; filename="collections.xml"',
        },
      });
    }

    const content = buildCsvExport(headers, items);

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="collections.csv"',
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