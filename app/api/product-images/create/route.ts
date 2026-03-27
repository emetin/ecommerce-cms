import { NextResponse } from "next/server";
import {
  appendSheetRow,
  getSheetData,
  getSheetHeaders,
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../lib/sheets";

type ProductImageItem = Record<string, string>;

const SHEET_NAME = "product_images";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeBool(value: unknown, fallback = "false") {
  return String(value || fallback).trim().toLowerCase();
}

function buildImageId() {
  return `img_${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const productSlug = normalizeText(body?.product_slug).toLowerCase();
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

    const headers = await getSheetHeaders(SHEET_NAME);

    if (isMain === "true") {
      const rows = await getSheetRows(SHEET_NAME);

      if (rows.length > 1) {
        const sheetHeaders = rows[0].map((item) => String(item).trim());

        for (let i = 1; i < rows.length; i += 1) {
          const row = rows[i];
          const rowObject: Record<string, string> = {};

          sheetHeaders.forEach((header, index) => {
            rowObject[header] = row[index] ? String(row[index]) : "";
          });

          const rowSlug = String(rowObject.product_slug || "")
            .trim()
            .toLowerCase();

          if (rowSlug === productSlug && String(rowObject.is_main || "") === "true") {
            const updated: Record<string, string> = {
  ...rowObject,
  is_main: "false",
  updated_at: now,
};

            const rowValues = sheetHeaders.map((header) => updated[header] || "");
            await updateSheetRowByRowNumber(SHEET_NAME, i + 1, rowValues);
          }
        }
      }
    }

    const item: ProductImageItem = {
      id: imageId,
      product_slug: productSlug,
      image_url: imageUrl,
      alt_text: altText,
      is_main: isMain,
      sort_order: sortOrder || "999",
      created_at: now,
      updated_at: now,
    };

    const rowValues = headers.map((header) => item[header] || "");
    await appendSheetRow(SHEET_NAME, rowValues);

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