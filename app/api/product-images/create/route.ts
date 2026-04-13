import { NextResponse } from "next/server";
import { appendSheetRow, getSheetData } from "../../../../lib/sheets";
import { generateProductImageAltText } from "../../../../lib/alt-text";

type ProductRecord = Record<string, string>;
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

function toSafeOrder(value: unknown, fallback = 0) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : fallback;
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
    const altTextInput = normalizeText(body?.alt_text);
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

    const [products, existingImages] = await Promise.all([
      getSheetData("products") as Promise<ProductRecord[]>,
      getSheetData("product_images") as Promise<ProductImageRecord[]>,
    ]);

    const product =
      products.find(
        (item) => normalizeText(item.slug).toLowerCase() === productSlug
      ) || null;

    const relatedImages = existingImages.filter(
      (item) => normalizeText(item.product_slug).toLowerCase() === productSlug
    );

    const imageFileId = rawImageFileId || extractFileNameFromUrl(imageUrl);

    const computedOrder =
      sortOrder ||
      String(
        relatedImages.length > 0
          ? Math.max(...relatedImages.map((item) => toSafeOrder(item.sort_order, 0))) + 1
          : 1
      );

    const finalAltText =
      altTextInput ||
      generateProductImageAltText({
        productTitle: product?.title || "",
        productSlug,
        imageType: isMain === "true" ? "product" : "gallery",
        order: isMain === "true" ? "" : computedOrder,
      });

    const now = new Date().toISOString();
    const id = `pimg_${Date.now()}`;

    const item = {
      id,
      product_slug: productSlug,
      image_url: imageUrl,
      image_file_id: imageFileId,
      image_uploaded_at: imageUploadedAt,
      sort_order: computedOrder,
      alt_text: finalAltText,
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