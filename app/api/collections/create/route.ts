import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

type CollectionRecord = {
  title?: string;
  slug?: string;
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

function makeSlug(text: string) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

    const title = normalizeText(body?.title);
    const slugInput = normalizeText(body?.slug);
    const description = normalizeText(body?.description);
    const image = normalizeText(body?.image_url || body?.image);
    const imageFileId = normalizeText(body?.image_file_id);
    const imageAlt = normalizeText(body?.image_alt || title);
    const status = normalizeStatus(body?.status);
    const sortOrder = toIntegerOrNull(body?.sort_order);
    const seoTitle = normalizeText(body?.seo_title || title);
    const seoDescription = normalizeText(body?.seo_description || description);

    if (!title) {
      return jsonError("Title is required.", 400);
    }

    const finalSlug = makeSlug(slugInput || title);

    if (!finalSlug) {
      return jsonError("A valid slug could not be generated.", 400);
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return jsonError(
        'Status must be one of: "published", "draft", or "archived".',
        400
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: existingSlug, error: existingSlugError } = await supabase
      .from("collections")
      .select("id, slug")
      .eq("slug", finalSlug)
      .maybeSingle();

    if (existingSlugError) {
      throw new Error(existingSlugError.message);
    }

    if (existingSlug) {
      return jsonError("This slug is already in use.", 400);
    }

    const { data: existingTitle, error: existingTitleError } = await supabase
      .from("collections")
      .select("id, title")
      .ilike("title", title)
      .maybeSingle();

    if (existingTitleError) {
      throw new Error(existingTitleError.message);
    }

    if (existingTitle) {
      return jsonError("A collection with this title already exists.", 400);
    }

    const now = new Date().toISOString();

    const { data: collection, error: createError } = await supabase
      .from("collections")
      .insert({
        title,
        slug: finalSlug,
        description: description || null,
        image_url: image || null,
        image_file_id: imageFileId || null,
        image_alt: imageAlt || null,
        status,
        sort_order: sortOrder,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        created_at: now,
        updated_at: now,
      })
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

    if (createError) {
      throw new Error(createError.message);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Collection created successfully.",
        item: {
          id: normalizeText(collection.id),
          title: normalizeText(collection.title),
          slug: normalizeText(collection.slug),
          description: normalizeText(collection.description),
          image: normalizeText(collection.image_url),
          image_url: normalizeText(collection.image_url),
          image_file_id: normalizeText(collection.image_file_id),
          image_alt: normalizeText(collection.image_alt),
          image_uploaded_at: now,
          status: normalizeText(collection.status),
          sort_order: normalizeText(collection.sort_order),
          created_at: normalizeText(collection.created_at),
          updated_at: normalizeText(collection.updated_at),
          seo_title: normalizeText(collection.seo_title),
          seo_description: normalizeText(collection.seo_description),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while creating the collection."
    );
  }
}