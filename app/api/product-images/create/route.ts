import { NextResponse } from "next/server";
import {
  appendSheetRow,
  getSheetData,
  getSheetHeaders,
  getSheetRows,
  updateSheetRowByRowNumber,
  updateSheetRowBySlug,
} from "../../../../lib/sheets";

type ProductImageItem = Record<string, string>;
type ProductItem = Record<string, string>;

const SHEET_NAME = "product_images";
const PRODUCTS_SHEET_NAME = "products";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeBool(value: unknown, fallback = "false") {
  return normalizeLower(value || fallback);
}

function isTrue(value: unknown) {
  return normalizeLower(value) === "true";
}

function toSafeOrder(value: unknown) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : 999999;
}

function buildImageId() {
  return `img_${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function sortImages(items: ProductImageItem[]) {
  return [...items].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    const byOrder = toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
    if (byOrder !== 0) return byOrder;

    return normalizeText(a.id).localeCompare(normalizeText(b.id));
  });
}

async function syncMainProductImage(productSlug: string, imageUrl: string) {
  const products = (await getSheetData(PRODUCTS_SHEET_NAME, {
    forceFresh: true,
    ttlSeconds: 30,
  })) as ProductItem[];

  const product = products.find(
    (item) => normalizeLower(item.slug) === normalizeLower(productSlug)
  );

  if (!product) return;

  const headers = await getSheetHeaders(PRODUCTS_SHEET_NAME, {
    forceFresh: true,
    ttlSeconds: 30,
  });

  const updatedProduct: ProductItem = {
    ...product,
    image: imageUrl,
    updated_at: new Date().toISOString(),
  };

  const rowValues = headers.map((header) => updatedProduct[header] || "");
  await updateSheetRowBySlug(PRODUCTS_SHEET_NAME, productSlug, rowValues);
}

async function unsetOtherMainImages(productSlug: string, currentId: string, now: string) {
  const rows = await getSheetRows(SHEET_NAME, {
    forceFresh: true,
    ttlSeconds: 30,
  });

  if (rows.length <= 1) return;

  const headers = rows[0].map((item) => String(item).trim());

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const rowObject: Record<string, string> = {};

    headers.forEach((header, index) => {
      rowObject[header] = row[index] ? String(row[index]) : "";
    });

    const rowSlug = normalizeLower(rowObject.product_slug);
    const rowId = normalizeText(rowObject.id);
    const rowIsMain = normalizeLower(rowObject.is_main);

    if (rowSlug === normalizeLower(productSlug) && rowId !== currentId && rowIsMain === "true") {
      const updatedRow: Record<string, string> = {
        ...rowObject,
        is_main: "false",
        updated_at: now,
      };

      const rowValues = headers.map((header) => updatedRow[header] || "");
      await updateSheetRowByRowNumber(SHEET_NAME, i + 1, rowValues);
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const productSlug = normalizeLower(body?.product_slug);
    const imageUrl = normalizeText(body?.image_url);
    const altText = normalizeText(body?.alt_text);
    const isMain = normalizeBool(body?.is_main, "false");
    const sortOrder = normalizeText(body?.sort_order);
    const providedId = normalizeText(body?.id);

    if (!productSlug) {
      return NextResponse.json(
        { ok: false, error: "Product slug is required." },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { ok: false, error: "Image URL is required." },
        { status: 400 }
      );
    }

    if (!["true", "false"].includes(isMain)) {
      return NextResponse.json(
        { ok: false, error: "Invalid is_main value." },
        { status: 400 }
      );
    }

    const imageId = providedId || buildImageId();
    const now = new Date().toISOString();

    if (isMain === "true") {
      await unsetOtherMainImages(productSlug, imageId, now);
    }

    const existingImages = (await getSheetData(SHEET_NAME, {
      forceFresh: true,
      ttlSeconds: 30,
    })) as ProductImageItem[];

    const sameProductImages = existingImages.filter(
      (item) => normalizeLower(item.product_slug) === productSlug
    );

    const item: ProductImageItem = {
      id: imageId,
      product_slug: productSlug,
      image_url: imageUrl,
      alt_text: altText,
      is_main: sameProductImages.length === 0 ? "true" : isMain,
      sort_order: sortOrder || String(sameProductImages.length + 1),
      created_at: now,
      updated_at: now,
    };

    const headers = await getSheetHeaders(SHEET_NAME, {
      forceFresh: true,
      ttlSeconds: 30,
    });

    const rowValues = headers.map((header) => item[header] || "");
    await appendSheetRow(SHEET_NAME, rowValues);

    const refreshedImages = (await getSheetData(SHEET_NAME, {
      forceFresh: true,
      ttlSeconds: 30,
    })) as ProductImageItem[];

    const bestMain =
      sortImages(
        refreshedImages.filter(
          (image) => normalizeLower(image.product_slug) === productSlug
        )
      )[0] || null;

    await syncMainProductImage(productSlug, normalizeText(bestMain?.image_url || ""));

    return NextResponse.json({
      ok: true,
      message: "Product image created successfully.",
      item,
    });
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