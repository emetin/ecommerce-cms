import { NextResponse } from "next/server";
import { getSheetData, getSheetHeaders } from "../../../../lib/sheets";
import { updateSheetRowById } from "../../../../lib/sheets-row-utils";

type ProductImageRecord = Record<string, string>;

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

    const id = normalizeText(body?.id);
    const productSlug = normalizeText(body?.product_slug).toLowerCase();
    const imageUrl = normalizeText(body?.image_url);
    const rawImageFileId = normalizeText(body?.image_file_id);
    const imageUploadedAt = normalizeText(body?.image_uploaded_at);
    const sortOrder = normalizeText(body?.sort_order);
    const altText = normalizeText(body?.alt_text);
    const isMain = normalizeBooleanString(body?.is_main, "false");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id is required." },
        { status: 400 }
      );
    }

    const items = (await getSheetData("product_images")) as ProductImageRecord[];
    const current =
      items.find((item) => String(item.id || "").trim() === id) || null;

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Product image not found." },
        { status: 404 }
      );
    }

    const headers = await getSheetHeaders("product_images");
    const updatedAt = new Date().toISOString();

    const nextImageUrl = imageUrl || current.image_url || "";
    const nextImageFileId =
      rawImageFileId ||
      current.image_file_id ||
      extractFileNameFromUrl(nextImageUrl);

    const merged: Record<string, string> = {
      ...current,
      id,
      product_slug: productSlug || current.product_slug || "",
      image_url: nextImageUrl,
      image_file_id: nextImageFileId,
      image_uploaded_at: imageUploadedAt || current.image_uploaded_at || "",
      sort_order: sortOrder || current.sort_order || "",
      alt_text: altText || current.alt_text || "",
      is_main: isMain,
      created_at: current.created_at || "",
      updated_at: updatedAt,
    };

    const rowValues = headers.map((header) => merged[header] || "");

    await updateSheetRowById("product_images", id, rowValues);

    return NextResponse.json({
      ok: true,
      message: "Product image updated successfully.",
      item: merged,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update product image.",
      },
      { status: 500 }
    );
  }
}