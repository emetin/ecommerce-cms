import { NextResponse } from "next/server";
import { appendSheetRow, getSheetData } from "../../../../lib/sheets";

type CollectionRecord = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  image?: string;
  image_file_id?: string;
  image_alt?: string;
  image_uploaded_at?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  seo_title?: string;
  seo_description?: string;
};

const SHEET_NAME = "collections";
const ALLOWED_STATUS = ["published", "draft", "archived"];

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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = normalizeText(body?.title);
    const slugInput = normalizeText(body?.slug);
    const description = normalizeText(body?.description);
    const image = normalizeText(body?.image);
    const imageFileId = normalizeText(body?.image_file_id);
    const imageAlt = normalizeText(body?.image_alt);
    const imageUploadedAt = normalizeText(body?.image_uploaded_at);
    const status = normalizeStatus(body?.status);
    const seoTitle = normalizeText(body?.seo_title);
    const seoDescription = normalizeText(body?.seo_description);

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

    const existingCollections = (await getSheetData(
      SHEET_NAME
    )) as CollectionRecord[];

    const normalizedTitle = title.toLowerCase();
    const normalizedSlug = finalSlug.toLowerCase();

    const slugExists = existingCollections.some(
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

    const titleExists = existingCollections.some(
      (item) => String(item.title || "").trim().toLowerCase() === normalizedTitle
    );

    if (titleExists) {
      return NextResponse.json(
        {
          ok: false,
          error: "A collection with this title already exists.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const id = `col_${Date.now()}`;

    const finalSeoTitle = seoTitle || title;
    const finalSeoDescription = seoDescription || description;

    await appendSheetRow(SHEET_NAME, [
      id,
      title,
      finalSlug,
      description,
      image,
      imageFileId,
      imageAlt,
      imageUploadedAt,
      status,
      now,
      now,
      finalSeoTitle,
      finalSeoDescription,
    ]);

    return NextResponse.json(
      {
        ok: true,
        message: "Collection created successfully.",
        item: {
          id,
          title,
          slug: finalSlug,
          description,
          image,
          image_file_id: imageFileId,
          image_alt: imageAlt,
          image_uploaded_at: imageUploadedAt,
          status,
          created_at: now,
          updated_at: now,
          seo_title: finalSeoTitle,
          seo_description: finalSeoDescription,
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
            : "An unexpected error occurred while creating the collection.",
      },
      { status: 500 }
    );
  }
}