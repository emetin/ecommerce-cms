import { NextRequest, NextResponse } from "next/server";
import { buildCsvExport } from "../../../../lib/export/csv-export";
import { buildJsonExport } from "../../../../lib/export/json-export";
import { buildXmlExport } from "../../../../lib/export/xml-export";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

type ProductImageRow = {
  image_url?: string | null;
  sort_order?: number | null;
  is_main?: boolean | null;
  created_at?: string | null;
};

type ProductCollectionRow = {
  collections?: {
    slug?: string | null;
  } | null;
};

type ProductRow = {
  id?: string | null;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  image_file_id?: string | null;
  image_alt?: string | null;
  status?: string | null;
  featured?: boolean | null;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  vendor?: string | null;
  product_category?: string | null;
  product_type?: string | null;
  tags?: string | null;

  sku?: string | null;
  barcode?: string | null;
  base_price?: number | string | null;
  compare_at_price?: number | string | null;
  cost_price?: number | string | null;
  currency?: string | null;
  box_quantity?: number | null;
  min_order_quantity?: number | null;
  quantity_step?: number | null;
  inventory_quantity?: number | null;
  inventory_policy?: string | null;
  inventory_tracker?: string | null;
  taxable?: boolean | null;
  requires_shipping?: boolean | null;
  weight?: number | string | null;
  weight_unit?: string | null;
  is_wholesale_only?: boolean | null;
  allow_quote_request?: boolean | null;
  allow_online_checkout?: boolean | null;

  product_images?: ProductImageRow[] | null;
  product_collections?: ProductCollectionRow[] | null;
};

const PRODUCT_EXPORT_HEADERS = [
  "id",
  "title",
  "slug",
  "description",
  "short_description",
  "image",
  "image_url",
  "image_file_id",
  "image_alt",
  "gallery",
  "collection_slug",
  "status",
  "featured",
  "seo_title",
  "seo_description",
  "created_at",
  "updated_at",
  "vendor",
  "product_category",
  "type",
  "product_type",
  "tags",
  "sku",
  "barcode",
  "base_price",
  "compare_at_price",
  "cost_price",
  "currency",
  "box_quantity",
  "min_order_quantity",
  "quantity_step",
  "inventory_quantity",
  "inventory_policy",
  "inventory_tracker",
  "taxable",
  "requires_shipping",
  "weight",
  "weight_unit",
  "is_wholesale_only",
  "allow_quote_request",
  "allow_online_checkout",
];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function boolToString(value: unknown) {
  return value === true ? "true" : "false";
}

function sortImages(images: ProductImageRow[]) {
  return [...images].sort((a, b) => {
    const aMain = a.is_main === true;
    const bMain = b.is_main === true;

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    const aSort = Number(a.sort_order ?? 999999);
    const bSort = Number(b.sort_order ?? 999999);

    if (aSort !== bSort) {
      return aSort - bSort;
    }

    return normalizeText(a.created_at).localeCompare(normalizeText(b.created_at));
  });
}

function getGallery(product: ProductRow) {
  const images = sortImages(product.product_images || []);

  return images
    .map((image) => normalizeText(image.image_url))
    .filter(Boolean)
    .join("|");
}

function getCollectionSlug(product: ProductRow) {
  return normalizeText(product.product_collections?.[0]?.collections?.slug);
}

function mapProductForExport(product: ProductRow) {
  const image = normalizeText(product.image_url);
  const productType = normalizeText(product.product_type);

  return {
    id: normalizeText(product.id),
    title: normalizeText(product.title),
    slug: normalizeText(product.slug),
    description: normalizeText(product.description),
    short_description: normalizeText(product.short_description),
    image,
    image_url: image,
    image_file_id: normalizeText(product.image_file_id),
    image_alt: normalizeText(product.image_alt),
    gallery: getGallery(product),
    collection_slug: getCollectionSlug(product),
    status: normalizeText(product.status || "draft"),
    featured: boolToString(product.featured),
    seo_title: normalizeText(product.seo_title),
    seo_description: normalizeText(product.seo_description),
    created_at: normalizeText(product.created_at),
    updated_at: normalizeText(product.updated_at),
    vendor: normalizeText(product.vendor),
    product_category: normalizeText(product.product_category),
    type: productType,
    product_type: productType,
    tags: normalizeText(product.tags),

    sku: normalizeText(product.sku),
    barcode: normalizeText(product.barcode),
    base_price: normalizeText(product.base_price),
    compare_at_price: normalizeText(product.compare_at_price),
    cost_price: normalizeText(product.cost_price),
    currency: normalizeText(product.currency || "USD"),
    box_quantity: normalizeText(product.box_quantity),
    min_order_quantity: normalizeText(product.min_order_quantity),
    quantity_step: normalizeText(product.quantity_step),
    inventory_quantity: normalizeText(product.inventory_quantity),
    inventory_policy: normalizeText(product.inventory_policy),
    inventory_tracker: normalizeText(product.inventory_tracker),
    taxable: boolToString(product.taxable ?? true),
    requires_shipping: boolToString(product.requires_shipping ?? true),
    weight: normalizeText(product.weight),
    weight_unit: normalizeText(product.weight_unit),
    is_wholesale_only: boolToString(product.is_wholesale_only ?? true),
    allow_quote_request: boolToString(product.allow_quote_request ?? true),
    allow_online_checkout: boolToString(product.allow_online_checkout ?? false),
  };
}

async function getProductsExportData() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      title,
      slug,
      description,
      short_description,
      image_url,
      image_file_id,
      image_alt,
      status,
      featured,
      seo_title,
      seo_description,
      created_at,
      updated_at,
      vendor,
      product_category,
      product_type,
      tags,
      sku,
      barcode,
      base_price,
      compare_at_price,
      cost_price,
      currency,
      box_quantity,
      min_order_quantity,
      quantity_step,
      inventory_quantity,
      inventory_policy,
      inventory_tracker,
      taxable,
      requires_shipping,
      weight,
      weight_unit,
      is_wholesale_only,
      allow_quote_request,
      allow_online_checkout,
      product_images (
        image_url,
        sort_order,
        is_main,
        created_at
      ),
      product_collections (
        collections (
          slug
        )
      )
    `
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return {
    headers: PRODUCT_EXPORT_HEADERS,
    items: ((data || []) as ProductRow[]).map(mapProductForExport),
    xmlRoot: "products",
    xmlItem: "product",
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

    const { headers, items, xmlRoot, xmlItem } = await getProductsExportData();

    if (format === "json") {
      const content = buildJsonExport(items);

      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="products.json"',
        },
      });
    }

    if (format === "xml") {
      const content = buildXmlExport(xmlRoot, xmlItem, headers, items);

      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": 'attachment; filename="products.xml"',
        },
      });
    }

    const content = buildCsvExport(headers, items);

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="products.csv"',
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