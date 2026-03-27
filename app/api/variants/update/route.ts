import { NextResponse } from "next/server";
import {
  getSheetHeaders,
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../lib/sheets";

const SHEET_NAME = "product_variants";
const ALLOWED_STATUS = ["published", "draft", "archived"];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeStatus(value: unknown, fallback = "draft") {
  return String(value || fallback).trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const id = normalizeText(body?.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Variant id is required." },
        { status: 400 }
      );
    }

    const rows = await getSheetRows(SHEET_NAME);

    if (!rows.length) {
      return NextResponse.json(
        { ok: false, error: "Variants sheet is empty." },
        { status: 404 }
      );
    }

    const headers = await getSheetHeaders(SHEET_NAME);
    const sheetHeaders = rows[0].map((item) => String(item).trim());

    let foundRowNumber: number | null = null;
    let currentItem: Record<string, string> | null = null;

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const rowObject: Record<string, string> = {};

      sheetHeaders.forEach((header, index) => {
        rowObject[header] = row[index] ? String(row[index]) : "";
      });

      if (String(rowObject.id || "").trim() === id) {
        foundRowNumber = i + 1;
        currentItem = rowObject;
        break;
      }
    }

    if (!foundRowNumber || !currentItem) {
      return NextResponse.json(
        { ok: false, error: "Variant not found." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const productSlug = normalizeText(body?.product_slug).toLowerCase();
    const option1Name = normalizeText(body?.option1_name);
    const option1Value = normalizeText(body?.option1_value);
    const option2Name = normalizeText(body?.option2_name);
    const option2Value = normalizeText(body?.option2_value);
    const option3Name = normalizeText(body?.option3_name);
    const option3Value = normalizeText(body?.option3_value);
    const sku = normalizeText(body?.sku);
    const barcode = normalizeText(body?.barcode);
    const price = normalizeText(body?.price);
    const compareAtPrice = normalizeText(body?.compare_at_price);
    const inventoryTracker = normalizeText(body?.inventory_tracker);
    const inventoryPolicy = normalizeText(body?.inventory_policy);
    const fulfillmentService = normalizeText(body?.fulfillment_service);
    const requiresShipping = normalizeText(body?.requires_shipping);
    const taxable = normalizeText(body?.taxable);
    const imageId = normalizeText(body?.image_id);
    const weight = normalizeText(body?.weight);
    const weightUnit = normalizeText(body?.weight_unit);
    const boxQuantity = normalizeText(body?.box_quantity);
    const status = normalizeStatus(body?.status, currentItem.status || "draft");

    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status value." },
        { status: 400 }
      );
    }

    const updatedItem: Record<string, string> = {
      ...currentItem,
      product_slug: productSlug || String(currentItem.product_slug || ""),
      option1_name: option1Name || String(currentItem.option1_name || ""),
      option1_value: option1Value || String(currentItem.option1_value || ""),
      option2_name: option2Name || String(currentItem.option2_name || ""),
      option2_value: option2Value || String(currentItem.option2_value || ""),
      option3_name: option3Name || String(currentItem.option3_name || ""),
      option3_value: option3Value || String(currentItem.option3_value || ""),
      sku: sku || String(currentItem.sku || ""),
      barcode: barcode || String(currentItem.barcode || ""),
      price: price || String(currentItem.price || ""),
      compare_at_price:
        compareAtPrice || String(currentItem.compare_at_price || ""),
      inventory_tracker:
        inventoryTracker || String(currentItem.inventory_tracker || ""),
      inventory_policy:
        inventoryPolicy || String(currentItem.inventory_policy || ""),
      fulfillment_service:
        fulfillmentService || String(currentItem.fulfillment_service || ""),
      requires_shipping:
        requiresShipping || String(currentItem.requires_shipping || ""),
      taxable: taxable || String(currentItem.taxable || ""),
      image_id: imageId,
      weight: weight || String(currentItem.weight || ""),
      weight_unit: weightUnit || String(currentItem.weight_unit || ""),
      box_quantity: boxQuantity || String(currentItem.box_quantity || ""),
      status,
      updated_at: now,
    };

    const rowValues = headers.map((header) => updatedItem[header] || "");

    await updateSheetRowByRowNumber(SHEET_NAME, foundRowNumber, rowValues);

    return NextResponse.json({
      ok: true,
      message: "Variant updated successfully.",
      item: updatedItem,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to update variant.",
      },
      { status: 500 }
    );
  }
}