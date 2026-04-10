import { NextResponse } from "next/server";
import {
  getSheetData,
  getSheetHeaders,
  updateSheetRowBySlug,
} from "../../../../lib/sheets";

type ProductRecord = Record<string, string>;

const SHEET_NAME = "products";
const ALLOWED_STATUS = ["published", "draft", "archived"];
const ALLOWED_FEATURED = ["true", "false"];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function hasOwn(obj: unknown, key: string) {
  return !!obj && typeof obj === "object" && key in obj;
}

function normalizeStatus(value: unknown, fallback = "draft") {
  const normalized = String(value ?? fallback).trim().toLowerCase();
  return normalized || fallback;
}

function normalizeBool(value: unknown, fallback = "false") {
  const normalized = String(value ?? fallback).trim().toLowerCase();
  return normalized || fallback;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const slug = normalizeText(body?.slug).toLowerCase();

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Slug is required." },
        { status: 400 }
      );
    }

    const items = (await getSheetData(SHEET_NAME)) as ProductRecord[];
    const current =
      items.find(
        (item) => String(item.slug || "").trim().toLowerCase() === slug
      ) || null;

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    const nextTitle = hasOwn(body, "title")
      ? normalizeText(body?.title)
      : normalizeText(current.title);

    if (!nextTitle) {
      return NextResponse.json(
        { ok: false, error: "Title is required." },
        { status: 400 }
      );
    }

    const nextDescription = hasOwn(body, "description")
      ? normalizeText(body?.description)
      : normalizeText(current.description);

    const nextShortDescription = hasOwn(body, "short_description")
      ? normalizeText(body?.short_description)
      : normalizeText(current.short_description);

    const nextImage = hasOwn(body, "image")
      ? normalizeText(body?.image)
      : normalizeText(current.image);

    const nextImageFileId = hasOwn(body, "image_file_id")
      ? normalizeText(body?.image_file_id)
      : normalizeText(current.image_file_id);

    const nextImageAlt = hasOwn(body, "image_alt")
      ? normalizeText(body?.image_alt)
      : normalizeText(current.image_alt);

    const nextImageUploadedAt = hasOwn(body, "image_uploaded_at")
      ? normalizeText(body?.image_uploaded_at)
      : normalizeText(current.image_uploaded_at);

    const nextGallery = hasOwn(body, "gallery")
      ? normalizeText(body?.gallery)
      : normalizeText(current.gallery);

    const nextCollectionSlug = hasOwn(body, "collection_slug")
      ? normalizeText(body?.collection_slug)
      : normalizeText(current.collection_slug);

    const nextStatus = hasOwn(body, "status")
      ? normalizeStatus(body?.status)
      : normalizeStatus(current.status, "draft");

    const nextFeatured = hasOwn(body, "featured")
      ? normalizeBool(body?.featured, "false")
      : normalizeBool(current.featured, "false");

    const nextSeoTitle = hasOwn(body, "seo_title")
      ? normalizeText(body?.seo_title)
      : normalizeText(current.seo_title);

    const nextSeoDescription = hasOwn(body, "seo_description")
      ? normalizeText(body?.seo_description)
      : normalizeText(current.seo_description);

    const nextVendor = hasOwn(body, "vendor")
      ? normalizeText(body?.vendor)
      : normalizeText(current.vendor);

    const nextProductCategory = hasOwn(body, "product_category")
      ? normalizeText(body?.product_category)
      : normalizeText(current.product_category);

    const nextType = hasOwn(body, "type")
      ? normalizeText(body?.type)
      : normalizeText(current.type);

    const nextTags = hasOwn(body, "tags")
      ? normalizeText(body?.tags)
      : normalizeText(current.tags);

    if (!ALLOWED_STATUS.includes(nextStatus)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status value." },
        { status: 400 }
      );
    }

    if (!ALLOWED_FEATURED.includes(nextFeatured)) {
      return NextResponse.json(
        { ok: false, error: "Invalid featured value." },
        { status: 400 }
      );
    }

    const headers = await getSheetHeaders(SHEET_NAME);
    const updatedAt = new Date().toISOString();

    const merged: Record<string, string> = {
      ...current,
      title: nextTitle,
      slug,
      description: nextDescription,
      short_description: nextShortDescription,
      image: nextImage,
      image_file_id: nextImageFileId,
      image_alt: nextImageAlt,
      image_uploaded_at: nextImageUploadedAt,
      gallery: nextGallery,
      collection_slug: nextCollectionSlug,
      status: nextStatus,
      featured: nextFeatured,
      seo_title: nextSeoTitle || nextTitle,
      seo_description:
        nextSeoDescription || nextShortDescription || nextDescription,
      vendor: nextVendor,
      product_category: nextProductCategory,
      type: nextType,
      tags: nextTags,
      updated_at: updatedAt,
    };

    const rowValues = headers.map((header) => merged[header] || "");

    await updateSheetRowBySlug(SHEET_NAME, slug, rowValues);

    return NextResponse.json({
      ok: true,
      message: "Product updated successfully.",
      item: merged,
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