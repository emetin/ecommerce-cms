import { NextResponse } from "next/server";
import {
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

  if (!product) {
    return;
  }

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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const id = normalizeText(body?.id);
    const imageUrl = normalizeText(body?.image_url);
    const altText = normalizeText(body?.alt_text);
    const sortOrder = normalizeText(body?.sort_order);
    const isMain = normalizeBool(body?.is_main, "false");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Image id is required." },
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

    const rows = await getSheetRows(SHEET_NAME, {
      forceFresh: true,
      ttlSeconds: 30,
    });

    if (rows.length <= 1) {
      return NextResponse.json(
        { ok: false, error: "No product images found." },
        { status: 404 }
      );
    }

    const headers = rows[0].map((item) => String(item).trim());

    let foundRowNumber: number | null = null;
    let existingItem: ProductImageItem | null = null;

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const rowObject: ProductImageItem = {};

      headers.forEach((header, index) => {
        rowObject[header] = row[index] ? String(row[index]) : "";
      });

      if (normalizeText(rowObject.id) === id) {
        foundRowNumber = i + 1;
        existingItem = rowObject;
        break;
      }
    }

    if (!foundRowNumber || !existingItem) {
      return NextResponse.json(
        { ok: false, error: "Image not found." },
        { status: 404 }
      );
    }

    const productSlug = normalizeLower(existingItem.product_slug);
    const now = new Date().toISOString();

    if (isMain === "true") {
      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i];
        const rowObject: ProductImageItem = {};

        headers.forEach((header, index) => {
          rowObject[header] = row[index] ? String(row[index]) : "";
        });

        const rowId = normalizeText(rowObject.id);
        const rowSlug = normalizeLower(rowObject.product_slug);
        const rowIsMain = normalizeLower(rowObject.is_main);

        if (rowSlug === productSlug && rowId !== id && rowIsMain === "true") {
          const updatedOther: ProductImageItem = {
            ...rowObject,
            is_main: "false",
            updated_at: now,
          };

          const otherRowValues = headers.map(
            (header) => updatedOther[header] || ""
          );

          await updateSheetRowByRowNumber(SHEET_NAME, i + 1, otherRowValues);
        }
      }
    }

    const updatedItem: ProductImageItem = {
      ...existingItem,
      image_url: imageUrl,
      alt_text: altText,
      sort_order: sortOrder || existingItem.sort_order || "999",
      is_main: isMain,
      updated_at: now,
    };

    const rowValues = headers.map((header) => updatedItem[header] || "");
    await updateSheetRowByRowNumber(SHEET_NAME, foundRowNumber, rowValues);

    const allImages = (await getSheetData(SHEET_NAME, {
      forceFresh: true,
      ttlSeconds: 30,
    })) as ProductImageItem[];

    const sameProductImages = sortImages(
      allImages.filter((item) => normalizeLower(item.product_slug) === productSlug)
    );

    const bestImage =
      sameProductImages.find((item) => isTrue(item.is_main)) ||
      sameProductImages[0] ||
      null;

    await syncMainProductImage(productSlug, normalizeText(bestImage?.image_url || ""));

    return NextResponse.json({
      ok: true,
      message: "Product image updated successfully.",
      item: updatedItem,
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