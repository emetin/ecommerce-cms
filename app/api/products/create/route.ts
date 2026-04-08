import { NextResponse } from "next/server";
import { appendSheetRow, getSheetData } from "../../../../lib/sheets";

type ProductRecord = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  short_description?: string;
  image?: string;
  image_file_id?: string;
  image_alt?: string;
  image_uploaded_at?: string;
  gallery?: string;
  collection_slug?: string;
  status?: string;
  featured?: string;
  seo_title?: string;
  seo_description?: string;
  created_at?: string;
  updated_at?: string;
  vendor?: string;
  product_category?: string;
  type?: string;
  tags?: string;
};

const ALLOWED_STATUS = ["published", "draft", "archived"];
const ALLOWED_FEATURED = ["true", "false"];
const SHEET_NAME = "products";

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
    const description = normalizeText(body?.description);
    const shortDescription = normalizeText(body?.short_description);
    const image = normalizeText(body?.image);
    const imageFileId = normalizeText(body?.image_file_id);
    const imageAlt = normalizeText(body?.image_alt);
    const imageUploadedAt = normalizeText(body?.image_uploaded_at);
    const gallery = normalizeText(body?.gallery);
    const collectionSlug = normalizeText(body?.collection_slug);
    const status = normalizeStatus(body?.status);
    const featured = normalizeBooleanString(body?.featured, "false");
    const seoTitle = normalizeText(body?.seo_title);
    const seoDescription = normalizeText(body?.seo_description);
    const vendor = normalizeText(body?.vendor);
    const productCategory = normalizeText(body?.product_category);
    const type = normalizeText(body?.type);
    const tags = normalizeText(body?.tags);

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Title is required." },
        { status: 400 }
      );
    }

    const finalSlug = makeSlug(slugInput || title);

    if (!finalSlug) {
      return NextResponse.json(
        { ok: false, error: "A valid slug could not be generated." },
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

    const existingProducts = (await getSheetData(SHEET_NAME)) as ProductRecord[];

    const normalizedTitle = title.toLowerCase();
    const normalizedSlug = finalSlug.toLowerCase();

    const slugExists = existingProducts.some(
      (item) => String(item.slug || "").trim().toLowerCase() === normalizedSlug
    );

    if (slugExists) {
      return NextResponse.json(
        { ok: false, error: "This slug is already in use." },
        { status: 400 }
      );
    }

    const titleExists = existingProducts.some(
      (item) => String(item.title || "").trim().toLowerCase() === normalizedTitle
    );

    if (titleExists) {
      return NextResponse.json(
        { ok: false, error: "A product with this title already exists." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const id = `prd_${Date.now()}`;

    const finalSeoTitle = seoTitle || title;
    const finalSeoDescription = seoDescription || shortDescription || description;

    await appendSheetRow(SHEET_NAME, [
      id,
      title,
      finalSlug,
      description,
      shortDescription,
      image,
      imageFileId,
      imageAlt,
      imageUploadedAt,
      gallery,
      collectionSlug,
      status,
      featured,
      finalSeoTitle,
      finalSeoDescription,
      now,
      now,
      vendor,
      productCategory,
      type,
      tags,
    ]);

    return NextResponse.json(
      {
        ok: true,
        message: "Product created successfully.",
        item: {
          id,
          title,
          slug: finalSlug,
          description,
          short_description: shortDescription,
          image,
          image_file_id: imageFileId,
          image_alt: imageAlt,
          image_uploaded_at: imageUploadedAt,
          gallery,
          collection_slug: collectionSlug,
          status,
          featured,
          seo_title: finalSeoTitle,
          seo_description: finalSeoDescription,
          created_at: now,
          updated_at: now,
          vendor,
          product_category: productCategory,
          type,
          tags,
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
            : "An unexpected error occurred while creating the product.",
      },
      { status: 500 }
    );
  }
}