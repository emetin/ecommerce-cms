import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

type BlogRecord = {
  title?: string;
  slug?: string;
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
      .from("blog")
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
      .from("blog")
      .select("id, title")
      .ilike("title", title)
      .maybeSingle();

    if (existingTitleError) {
      throw new Error(existingTitleError.message);
    }

    if (existingTitle) {
      return jsonError("A blog post with this title already exists.", 400);
    }

    const now = new Date().toISOString();

    const { data: post, error: createError } = await supabase
      .from("blog")
      .insert({
        title,
        slug: finalSlug,
        excerpt: excerpt || null,
        content: content || null,
        image_url: image || null,
        image_file_id: imageFileId || null,
        image_alt: imageAlt || null,
        status,
        featured,
        published_at: status === "published" ? now : null,
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

    if (createError) {
      throw new Error(createError.message);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Blog post created successfully.",
        item: {
          id: normalizeText(post.id),
          title: normalizeText(post.title),
          slug: normalizeText(post.slug),
          excerpt: normalizeText(post.excerpt),
          content: normalizeText(post.content),
          image: normalizeText(post.image_url),
          image_url: normalizeText(post.image_url),
          image_file_id: normalizeText(post.image_file_id),
          image_alt: normalizeText(post.image_alt),
          image_uploaded_at: now,
          status: normalizeText(post.status),
          featured: post.featured ? "true" : "false",
          published_at: normalizeText(post.published_at),
          seo_title: normalizeText(post.seo_title),
          seo_description: normalizeText(post.seo_description),
          created_at: normalizeText(post.created_at),
          updated_at: normalizeText(post.updated_at),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while creating the blog post."
    );
  }
}