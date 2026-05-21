import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

type CollectionRecord = {
  slug?: string;
  title?: string;
  description?: string;
  image?: string;
  image_url?: string;
  image_file_id?: string;
  image_alt?: string;
  image_uploaded_at?: string;
  status?: string;
  sort_order?: string | number;
  seo_title?: string;
  seo_description?: string;
};

const ALLOWED_STATUS = ["published", "draft", "archived"];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeStatus(value: unknown) {
  return normalizeLower(value || "draft");
}

function toIntegerOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.floor(number);
}

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as CollectionRecord;

    const slug = normalizeLower(body?.slug);
    const title = normalizeText(body?.title);
    const description = normalizeText(body?.description);
    const image = normalizeText(body?.image_url || body?.image);
    const imageFileId = normalizeText(body?.image_file_id);
    const imageAlt = normalizeText(body?.image_alt || title);
    const status = normalizeStatus(body?.status);
    const sortOrder = toIntegerOrNull(body?.sort_order);
    const seoTitle = normalizeText(body?.seo_title || title);
    const seoDescription = normalizeText(body?.seo_description || description);

    if (!slug) {
      return jsonError("Slug is required.", 400);
    }

    if (!title) {
      return jsonError("Title is required.", 400);
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return jsonError("Invalid status value.", 400);
    }

    const supabase = createSupabaseAdminClient();

    const { data: current, error: currentError } = await supabase
      .from("collections")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (currentError) {
      throw new Error(currentError.message);
    }

    if (!current) {
      return jsonError("Collection not found.", 404);
    }

    const updatedAt = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("collections")
      .update({
        title,
        description: description || null,
        image_url: image || null,
        image_file_id: imageFileId || null,
        image_alt: imageAlt || null,
        status,
        sort_order: sortOrder,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        updated_at: updatedAt,
      })
      .eq("id", current.id)
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
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Collection updated successfully.",
      item: {
        id: normalizeText(updated.id),
        title: normalizeText(updated.title),
        slug: normalizeText(updated.slug),
        description: normalizeText(updated.description),
        image: normalizeText(updated.image_url),
        image_url: normalizeText(updated.image_url),
        image_file_id: normalizeText(updated.image_file_id),
        image_alt: normalizeText(updated.image_alt),
        image_uploaded_at: updatedAt,
        status: normalizeText(updated.status),
        sort_order: normalizeText(updated.sort_order),
        created_at: normalizeText(updated.created_at),
        updated_at: normalizeText(updated.updated_at),
        seo_title: normalizeText(updated.seo_title),
        seo_description: normalizeText(updated.seo_description),
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to update collection."
    );
  }
}