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

function normalizeBool(value: unknown, fallback = "false") {
  return String(value || fallback).trim().toLowerCase();
}

async function syncMainProductImage(productSlug: string, imageUrl: string) {
  const products = (await getSheetData(PRODUCTS_SHEET_NAME)) as ProductItem[];

  const product = products.find(
    (item) =>
      String(item.slug || "").trim().toLowerCase() ===
      String(productSlug || "").trim().toLowerCase()
  );

  if (!product) {
    return;
  }

  const headers = await getSheetHeaders(PRODUCTS_SHEET_NAME);

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

    const rows = await getSheetRows(SHEET_NAME);

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

      if (String(rowObject.id || "").trim() === id) {
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

    const productSlug = String(existingItem.product_slug || "")
      .trim()
      .toLowerCase();
    const now = new Date().toISOString();

    if (isMain === "true") {
      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i];
        const rowObject: ProductImageItem = {};

        headers.forEach((header, index) => {
          rowObject[header] = row[index] ? String(row[index]) : "";
        });

        const rowId = String(rowObject.id || "").trim();
        const rowSlug = String(rowObject.product_slug || "")
          .trim()
          .toLowerCase();
        const rowIsMain =
          String(rowObject.is_main || "").trim().toLowerCase() === "true";

        if (rowSlug === productSlug && rowId !== id && rowIsMain) {
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
      sort_order: sortOrder || "999",
      is_main: isMain,
      updated_at: now,
    };

    const rowValues = headers.map((header) => updatedItem[header] || "");
    await updateSheetRowByRowNumber(SHEET_NAME, foundRowNumber, rowValues);

    if (isMain === "true") {
      await syncMainProductImage(productSlug, imageUrl);
    }

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