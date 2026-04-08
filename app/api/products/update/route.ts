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
  return String(value || "").trim();
}

function normalizeStatus(value: unknown) {
  return String(value || "draft").trim().toLowerCase();
}

function normalizeBool(value: unknown, fallback = "false") {
  return String(value || fallback).trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const slug = normalizeText(body?.slug).toLowerCase();
    const title = normalizeText(body?.title);
    const description = normalizeText(body?.description);
    const shortDescription = normalizeText(body?.short_description);
    const image = normalizeText(body?.image);
    const imageFileId = normalizeText(body?.image_file_id);
    const imageAlt = normalizeText(body?.image_alt);
    const imageUploadedAt = normalizeText(body?.image_uploaded_at);
    const gallery = normalizeText(body?.gallery);
    const collectionSlug = normalizeText(body?.collection_slug);
    const status = normalizeStatus(body?.status);
    const featured = normalizeBool(body?.featured, "false");
    const seoTitle = normalizeText(body?.seo_title);
    const seoDescription = normalizeText(body?.seo_description);
    const vendor = normalizeText(body?.vendor);
    const productCategory = normalizeText(body?.product_category);
    const type = normalizeText(body?.type);
    const tags = normalizeText(body?.tags);

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Slug is required." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Title is required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status value." },
        { status: 400 }
      );
    }

    if (!ALLOWED_FEATURED.includes(featured)) {
      return NextResponse.json(
        { ok: false, error: "Invalid featured value." },
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

    const headers = await getSheetHeaders(SHEET_NAME);
    const updatedAt = new Date().toISOString();

    const merged: Record<string, string> = {
      ...current,
      title,
      slug,
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
      seo_title: seoTitle || title,
      seo_description: seoDescription || shortDescription || description,
      updated_at: updatedAt,
      vendor,
      product_category: productCategory,
      type,
      tags,
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