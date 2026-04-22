import { NextResponse } from "next/server";
import {
  getSheetData,
  getSheetHeaders,
  updateSheetObjectBySlug,
} from "../../../../lib/sheets";
import { updateSheetRowById } from "../../../../lib/sheets-row-utils";

type ProductImageRecord = Record<string, string>;
type ProductRecord = Record<string, string>;

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isTrue(value: unknown) {
  return normalizeLower(value) === "true";
}

function normalizeBool(value: unknown, fallback = false) {
  const normalized = normalizeLower(value);
  if (!normalized) return fallback ? "true" : "false";
  return normalized === "true" ? "true" : "false";
}

function extractFileNameFromUrl(url: string) {
  const cleanUrl = normalizeText(url).split("?")[0].split("#")[0];
  const parts = cleanUrl.split("/");
  return parts[parts.length - 1] || "";
}

function toSafeOrder(value: unknown, fallback = 999999) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : fallback;
}

function sortImages(items: ProductImageRecord[]) {
  return [...items].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    return toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
  });
}

function buildRowValues(headers: string[], item: ProductImageRecord) {
  return headers.map((header) => normalizeText(item[header]));
}

async function syncProductPrimaryImage(productSlug: string) {
  const [products, productImages] = await Promise.all([
    getSheetData("products", {
      forceFresh: true,
      ttlSeconds: 0,
    }) as Promise<ProductRecord[]>,
    getSheetData("product_images", {
      forceFresh: true,
      ttlSeconds: 0,
    }) as Promise<ProductImageRecord[]>,
  ]);

  const product =
    products.find((item) => normalizeLower(item.slug) === normalizeLower(productSlug)) ||
    null;

  if (!product) return;

  const relatedImages = productImages.filter(
    (item) => normalizeLower(item.product_slug) === normalizeLower(productSlug)
  );

  const primaryImage = sortImages(relatedImages)[0]?.image_url || "";

  await updateSheetObjectBySlug("products", productSlug, {
    image: normalizeText(primaryImage),
    updated_at: new Date().toISOString(),
  });
}

async function clearOtherMainFlags(productSlug: string, excludeId: string) {
  const [items, headers] = await Promise.all([
    getSheetData("product_images", {
      forceFresh: true,
      ttlSeconds: 0,
    }) as Promise<ProductImageRecord[]>,
    getSheetHeaders("product_images", {
      forceFresh: true,
      ttlSeconds: 0,
    }),
  ]);

  const now = new Date().toISOString();

  const relatedMainItems = items.filter(
    (item) =>
      normalizeLower(item.product_slug) === normalizeLower(productSlug) &&
      normalizeText(item.id) !== excludeId &&
      isTrue(item.is_main)
  );

  for (const item of relatedMainItems) {
    const nextItem: ProductImageRecord = {
      ...item,
      is_main: "false",
      updated_at: now,
    };

    await updateSheetRowById(
      "product_images",
      normalizeText(item.id),
      buildRowValues(headers, nextItem)
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const id = normalizeText(body.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id is required." },
        { status: 400 }
      );
    }

    const [items, headers] = await Promise.all([
      getSheetData("product_images", {
        forceFresh: true,
        ttlSeconds: 0,
      }) as Promise<ProductImageRecord[]>,
      getSheetHeaders("product_images", {
        forceFresh: true,
        ttlSeconds: 0,
      }),
    ]);

    const current =
      items.find((item) => normalizeText(item.id) === id) || null;

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Product image not found." },
        { status: 404 }
      );
    }

    const productSlug = normalizeLower(body.product_slug || current.product_slug);
    const nextIsMain = normalizeBool(body.is_main, isTrue(current.is_main));

    const merged: ProductImageRecord = {
      ...current,
      id,
      product_slug: productSlug,
      image_url: normalizeText(body.image_url || current.image_url),
      image_file_id:
        normalizeText(body.image_file_id) ||
        normalizeText(current.image_file_id) ||
        extractFileNameFromUrl(
          normalizeText(body.image_url || current.image_url)
        ),
      image_uploaded_at: normalizeText(
        body.image_uploaded_at || current.image_uploaded_at
      ),
      sort_order: normalizeText(body.sort_order || current.sort_order),
      alt_text: normalizeText(body.alt_text || current.alt_text),
      is_main: nextIsMain,
      updated_at: new Date().toISOString(),
    };

    if (merged.is_main === "true") {
      await clearOtherMainFlags(productSlug, id);
    }

    await updateSheetRowById(
      "product_images",
      id,
      buildRowValues(headers, merged)
    );

    await syncProductPrimaryImage(productSlug);

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