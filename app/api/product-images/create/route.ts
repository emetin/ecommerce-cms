import { NextResponse } from "next/server";
import { appendSheetRow } from "../../../../lib/sheets";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeBooleanString(value: unknown, fallback = "false") {
  return String(value || fallback).trim().toLowerCase() === "true"
    ? "true"
    : "false";
}

function extractFileNameFromUrl(url: string) {
  const normalized = normalizeText(url);

  if (!normalized) {
    return "";
  }

  const cleanUrl = normalized.split("?")[0].split("#")[0];
  const parts = cleanUrl.split("/");
  return parts[parts.length - 1] || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const productSlug = normalizeText(body?.product_slug).toLowerCase();
    const imageUrl = normalizeText(body?.image_url);
    const rawImageFileId = normalizeText(body?.image_file_id);
    const imageUploadedAt =
      normalizeText(body?.image_uploaded_at) || new Date().toISOString();
    const sortOrder = normalizeText(body?.sort_order);
    const altText = normalizeText(body?.alt_text);
    const isMain = normalizeBooleanString(body?.is_main, "false");

    if (!productSlug) {
      return NextResponse.json(
        { ok: false, error: "product_slug is required." },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { ok: false, error: "image_url is required." },
        { status: 400 }
      );
    }

    const imageFileId = rawImageFileId || extractFileNameFromUrl(imageUrl);

    const now = new Date().toISOString();
    const id = `pimg_${Date.now()}`;

    const item = {
      id,
      product_slug: productSlug,
      image_url: imageUrl,
      image_file_id: imageFileId,
      image_uploaded_at: imageUploadedAt,
      sort_order: sortOrder,
      alt_text: altText,
      is_main: isMain,
      created_at: now,
      updated_at: now,
    };

    await appendSheetRow("product_images", [
      item.id,
      item.product_slug,
      item.image_url,
      item.image_file_id,
      item.image_uploaded_at,
      item.sort_order,
      item.alt_text,
      item.is_main,
      item.created_at,
      item.updated_at,
    ]);

    return NextResponse.json(
      {
        ok: true,
        message: "Product image created successfully.",
        item,
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
            : "Failed to create product image.",
      },
      { status: 500 }
    );
  }
}