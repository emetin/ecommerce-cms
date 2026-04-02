import { NextResponse } from "next/server";
import { getSheetData, updateSheetRowBySlug } from "../../../../lib/sheets";

type BlogRow = {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  image?: string;
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

function normalizeSlug(value: unknown) {
  return String(value || "").trim().toLowerCase();
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

    const originalSlug = normalizeSlug(body?.originalSlug);
    const title = normalizeText(body?.title);
    const slugInput = normalizeText(body?.slug);
    const excerpt = normalizeText(body?.excerpt);
    const content = normalizeText(body?.content);
    const image = normalizeText(body?.image);
    const status = normalizeStatus(body?.status);
    const featured = normalizeBooleanString(body?.featured, "false");

    if (!originalSlug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Original slug is required.",
        },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          ok: false,
          error: "Title is required.",
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

    const items = (await getSheetData("blog")) as BlogRow[];

    const currentItem =
      items.find(
        (item) =>
          String(item.slug || "").trim().toLowerCase() === originalSlug
      ) || null;

    if (!currentItem) {
      return NextResponse.json(
        {
          ok: false,
          error: "Blog post to update was not found.",
        },
        { status: 404 }
      );
    }

    const slugExistsOnAnotherItem = items.some((item) => {
      const itemSlug = String(item.slug || "").trim().toLowerCase();
      return itemSlug === finalSlug && itemSlug !== originalSlug;
    });

    if (slugExistsOnAnotherItem) {
      return NextResponse.json(
        {
          ok: false,
          error: "This slug is already used by another blog post.",
        },
        { status: 400 }
      );
    }

    const normalizedTitle = title.toLowerCase();

    const titleExistsOnAnotherItem = items.some((item) => {
      const itemSlug = String(item.slug || "").trim().toLowerCase();
      const itemTitle = String(item.title || "").trim().toLowerCase();

      return itemTitle === normalizedTitle && itemSlug !== originalSlug;
    });

    if (titleExistsOnAnotherItem) {
      return NextResponse.json(
        {
          ok: false,
          error: "Another blog post already uses this title.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const createdAt = String(currentItem.created_at || now);
    const id = String(currentItem.id || "");

    await updateSheetRowBySlug("blog", originalSlug, [
      id,
      title,
      finalSlug,
      excerpt,
      content,
      image,
      status,
      featured,
      createdAt,
      now,
    ]);

    return NextResponse.json({
      ok: true,
      message: "Blog post updated successfully.",
      item: {
        id,
        title,
        slug: finalSlug,
        excerpt,
        content,
        image,
        status,
        featured,
        created_at: createdAt,
        updated_at: now,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while updating the blog post.",
      },
      { status: 500 }
    );
  }
}