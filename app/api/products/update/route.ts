import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

const ALLOWED_PRODUCT_STATUSES = ["draft", "published", "archived"];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;

  const normalized = normalizeLower(value);

  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;

  return false;
}

function nullIfEmpty(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const slug = normalizeLower(body?.slug);
    const title = normalizeText(body?.title);
    const status = normalizeLower(body?.status || "draft");

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Product slug is required." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Product title is required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_PRODUCT_STATUSES.includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid product status." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const updatePayload = {
      title,
      description: nullIfEmpty(body?.description),
      short_description: nullIfEmpty(body?.short_description),
      image_url: nullIfEmpty(body?.image),
      status,
      featured: toBoolean(body?.featured),
      seo_title: nullIfEmpty(body?.seo_title),
      seo_description: nullIfEmpty(body?.seo_description),
      vendor: nullIfEmpty(body?.vendor),
      product_category: nullIfEmpty(body?.product_category),
      product_type: nullIfEmpty(body?.type || body?.product_type),
      tags: nullIfEmpty(body?.tags),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("slug", slug)
      .select("id, title, slug")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    const collectionSlug = normalizeLower(body?.collection_slug);

    if (collectionSlug) {
      const { data: collection, error: collectionError } = await supabase
        .from("collections")
        .select("id, slug")
        .eq("slug", collectionSlug)
        .maybeSingle();

      if (collectionError) {
        throw new Error(collectionError.message);
      }

      if (collection) {
        await supabase
          .from("products")
          .update({
            primary_collection_id: collection.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);

        await supabase.from("product_collections").upsert(
          {
            product_id: data.id,
            collection_id: collection.id,
            sort_order: 0,
          },
          {
            onConflict: "product_id,collection_id",
          }
        );

        await supabase.from("product_collection_links").upsert(
          {
            product_id: data.id,
            collection_id: collection.id,
            sort_order: 0,
          },
          {
            onConflict: "product_id,collection_id",
          }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      item: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to update product.",
      },
      { status: 500 }
    );
  }
}