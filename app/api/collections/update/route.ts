import { NextResponse } from "next/server";
import {
  getSheetData,
  getSheetHeaders,
  updateSheetRowBySlug,
} from "../../../../lib/sheets";

type CollectionRecord = Record<string, string>;

const SHEET_NAME = "collections";
const ALLOWED_STATUS = ["published", "draft", "archived"];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeStatus(value: unknown) {
  return String(value || "draft").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const slug = normalizeText(body?.slug).toLowerCase();
    const title = normalizeText(body?.title);
    const description = normalizeText(body?.description);
    const image = normalizeText(body?.image);
    const imageFileId = normalizeText(body?.image_file_id);
    const imageAlt = normalizeText(body?.image_alt);
    const imageUploadedAt = normalizeText(body?.image_uploaded_at);
    const status = normalizeStatus(body?.status);
    const seoTitle = normalizeText(body?.seo_title);
    const seoDescription = normalizeText(body?.seo_description);

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

    const items = (await getSheetData(SHEET_NAME)) as CollectionRecord[];
    const current =
      items.find(
        (item) => String(item.slug || "").trim().toLowerCase() === slug
      ) || null;

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Collection not found." },
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
      image,
      image_file_id: imageFileId,
      image_alt: imageAlt,
      image_uploaded_at: imageUploadedAt,
      status,
      updated_at: updatedAt,
      seo_title: seoTitle || title,
      seo_description: seoDescription || description,
    };

    const rowValues = headers.map((header) => merged[header] || "");

    await updateSheetRowBySlug(SHEET_NAME, slug, rowValues);

    return NextResponse.json({
      ok: true,
      message: "Collection updated successfully.",
      item: merged,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update collection.",
      },
      { status: 500 }
    );
  }
}