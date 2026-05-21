import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

type BlogRecord = {
  originalSlug?: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  image?: string;
  image_url?: string;
  image_file_id?: string;
  image_alt?: string;
  image_uploaded_at?: string;
  status?: string;
  featured?: string | boolean;
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

function normalizeSlug(value: unknown) {
  return normalizeLower(value);
}

function normalizeStatus(value: unknown) {
  return normalizeLower(value || "draft");
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeLower(value);

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
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
    const body = (await req.json().catch(() => ({}))) as BlogRecord;

    const originalSlug = normalizeSlug(body?.originalSlug);
    const title = normalizeText(body?.title);
    const slugInput = normalizeText(body?.slug);
    const excerpt = normalizeText(body?.excerpt);
    const content = normalizeText(body?.content);
    const image = normalizeText(body?.image_url || body?.image);
    const imageFileId = normalizeText(body?.image_file_id);
    const imageAlt = normalizeText(body?.image_alt || title);
    const status = normalizeStatus(body?.status);
    const featured = normalizeBoolean(body?.featured, false);
    const seoTitle = normalizeText(body?.seo_title || title);
    const seoDescription = normalizeText(
      body?.seo_description || excerpt || content
    );

    if (!originalSlug) {
      return jsonError("Original slug is required.", 400);
    }

    if (!title) {
      return jsonError("Title is required.", 400);
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return jsonError(
        'Status must be one of: "published", "draft", or "archived".',
        400
      );
    }

    const finalSlug = makeSlug(slugInput || title);

    if (!finalSlug) {
      return jsonError("A valid slug could not be generated.", 400);
    }

    const supabase = createSupabaseAdminClient();

    const { data: currentItem, error: currentError } = await supabase
      .from("blog")
      .select("id, slug, created_at, published_at")
      .eq("slug", originalSlug)
      .maybeSingle();

    if (currentError) {
      throw new Error(currentError.message);
    }

    if (!currentItem) {
      return jsonError("Blog post to update was not found.", 404);
    }

    if (finalSlug !== originalSlug) {
      const { data: slugConflict, error: slugConflictError } = await supabase
        .from("blog")
        .select("id, slug")
        .eq("slug", finalSlug)
        .neq("id", currentItem.id)
        .maybeSingle();

      if (slugConflictError) {
        throw new Error(slugConflictError.message);
      }

      if (slugConflict) {
        return jsonError("This slug is already used by another blog post.", 400);
      }
    }

    const { data: titleConflict, error: titleConflictError } = await supabase
      .from("blog")
      .select("id, title")
      .ilike("title", title)
      .neq("id", currentItem.id)
      .maybeSingle();

    if (titleConflictError) {
      throw new Error(titleConflictError.message);
    }

    if (titleConflict) {
      return jsonError("Another blog post already uses this title.", 400);
    }

    const now = new Date().toISOString();

    const nextPublishedAt =
      status === "published"
        ? normalizeText(currentItem.published_at) || now
        : null;

    const { data: updatedPost, error: updateError } = await supabase
      .from("blog")
      .update({
        title,
        slug: finalSlug,
        excerpt: excerpt || null,
        content: content || null,
        image_url: image || null,
        image_file_id: imageFileId || null,
        image_alt: imageAlt || null,
        status,
        featured,
        published_at: nextPublishedAt,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        updated_at: now,
      })
      .eq("id", currentItem.id)
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
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Blog post updated successfully.",
      item: {
        id: normalizeText(updatedPost.id),
        title,
        slug: finalSlug,
        excerpt,
        content,
        image,
        image_url: image,
        image_file_id: imageFileId,
        image_alt: imageAlt,
        image_uploaded_at: now,
        status,
        featured: featured ? "true" : "false",
        published_at: normalizeText(updatedPost.published_at),
        seo_title: normalizeText(updatedPost.seo_title),
        seo_description: normalizeText(updatedPost.seo_description),
        created_at: normalizeText(updatedPost.created_at),
        updated_at: normalizeText(updatedPost.updated_at),
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while updating the blog post."
    );
  }
}