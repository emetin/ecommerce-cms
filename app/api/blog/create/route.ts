import { NextResponse } from "next/server";
import { appendSheetRow, getSheetData } from "../../../../lib/sheets";

type BlogRecord = {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  image?: string;
  image_file_id?: string;
  image_alt?: string;
  image_uploaded_at?: string;
  status?: string;
  featured?: string;
  created_at?: string;
  updated_at?: string;
};

const ALLOWED_STATUS = ["published", "draft", "archived"];
const ALLOWED_FEATURED = ["true", "false"];

function makeSlug(text: string) {
  return text
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
  return String(value || "").trim();
}

function normalizeStatus(value: unknown) {
  return String(value || "draft").trim().toLowerCase();
}

function normalizeBooleanString(value: unknown, fallback = "false") {
  return String(value || fallback).trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = normalizeText(body?.title);
    const slugInput = normalizeText(body?.slug);
    const excerpt = normalizeText(body?.excerpt);
    const content = normalizeText(body?.content);
    const image = normalizeText(body?.image);
    const imageFileId = normalizeText(body?.image_file_id);
    const imageAlt = normalizeText(body?.image_alt);
    const imageUploadedAt = normalizeText(body?.image_uploaded_at);
    const status = normalizeStatus(body?.status);
    const featured = normalizeBooleanString(body?.featured, "false");

    if (!title) {
      return NextResponse.json(
        {
          ok: false,
          error: "Title is required.",
        },
        { status: 400 }
      );
    }

    const finalSlug = makeSlug(slugInput || title);

    if (!finalSlug) {
      return NextResponse.json(
        {
          ok: false,
          error: "A valid slug could not be generated.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Status must be one of: "published", "draft", or "archived".',
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_FEATURED.includes(featured)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Featured must be either "true" or "false".',
        },
        { status: 400 }
      );
    }

    const existingPosts = (await getSheetData("blog")) as BlogRecord[];

    const normalizedTitle = title.toLowerCase();
    const normalizedSlug = finalSlug.toLowerCase();

    const slugExists = existingPosts.some(
      (item) => String(item.slug || "").trim().toLowerCase() === normalizedSlug
    );

    if (slugExists) {
      return NextResponse.json(
        {
          ok: false,
          error: "This slug is already in use.",
        },
        { status: 400 }
      );
    }

    const titleExists = existingPosts.some(
      (item) => String(item.title || "").trim().toLowerCase() === normalizedTitle
    );

    if (titleExists) {
      return NextResponse.json(
        {
          ok: false,
          error: "A blog post with this title already exists.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const id = `blog_${Date.now()}`;

    await appendSheetRow("blog", [
      id,
      title,
      finalSlug,
      excerpt,
      content,
      image,
      imageFileId,
      imageAlt,
      imageUploadedAt,
      status,
      featured,
      now,
      now,
    ]);

    return NextResponse.json(
      {
        ok: true,
        message: "Blog post created successfully.",
        item: {
          id,
          title,
          slug: finalSlug,
          excerpt,
          content,
          image,
          image_file_id: imageFileId,
          image_alt: imageAlt,
          image_uploaded_at: imageUploadedAt,
          status,
          featured,
          created_at: now,
          updated_at: now,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while creating the blog post.",
      },
      { status: 500 }
    );
  }
}