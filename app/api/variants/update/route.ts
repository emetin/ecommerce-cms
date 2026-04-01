import { NextResponse } from "next/server";
import {
  getSheetHeaders,
  getSheetRows,
  updateSheetRowByRowNumber,
} from "../../../../lib/sheets";

type VariantRecord = Record<string, string>;

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
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

    const rows = await getSheetRows("product_variants");

    if (rows.length <= 1) {
      return NextResponse.json(
        { ok: false, error: "No variants found." },
        { status: 404 }
      );
    }

    const headers = rows[0].map((item) => String(item).trim());

    let foundRowNumber: number | null = null;
    let existingItem: VariantRecord | null = null;

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const rowObject: VariantRecord = {};

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
        { ok: false, error: "Variant not found." },
        { status: 404 }
      );
    }

    const updatedItem: VariantRecord = {
      ...existingItem,
      option1_name:
        body?.option1_name !== undefined
          ? normalizeText(body.option1_name)
          : existingItem.option1_name || "",
      option1_value:
        body?.option1_value !== undefined
          ? normalizeText(body.option1_value)
          : existingItem.option1_value || "",
      option2_name:
        body?.option2_name !== undefined
          ? normalizeText(body.option2_name)
          : existingItem.option2_name || "",
      option2_value:
        body?.option2_value !== undefined
          ? normalizeText(body.option2_value)
          : existingItem.option2_value || "",
      option3_name:
        body?.option3_name !== undefined
          ? normalizeText(body.option3_name)
          : existingItem.option3_name || "",
      option3_value:
        body?.option3_value !== undefined
          ? normalizeText(body.option3_value)
          : existingItem.option3_value || "",
      sku:
        body?.sku !== undefined ? normalizeText(body.sku) : existingItem.sku || "",
      barcode:
        body?.barcode !== undefined
          ? normalizeText(body.barcode)
          : existingItem.barcode || "",
      price:
        body?.price !== undefined
          ? normalizeText(body.price)
          : existingItem.price || "",
      compare_at_price:
        body?.compare_at_price !== undefined
          ? normalizeText(body.compare_at_price)
          : existingItem.compare_at_price || "",
      inventory_tracker:
        body?.inventory_tracker !== undefined
          ? normalizeText(body.inventory_tracker)
          : existingItem.inventory_tracker || "",
      inventory_policy:
        body?.inventory_policy !== undefined
          ? normalizeText(body.inventory_policy)
          : existingItem.inventory_policy || "",
      fulfillment_service:
        body?.fulfillment_service !== undefined
          ? normalizeText(body.fulfillment_service)
          : existingItem.fulfillment_service || "",
      requires_shipping:
        body?.requires_shipping !== undefined
          ? normalizeText(body.requires_shipping)
          : existingItem.requires_shipping || "",
      taxable:
        body?.taxable !== undefined
          ? normalizeText(body.taxable)
          : existingItem.taxable || "",
      variant_image:
        body?.variant_image !== undefined
          ? normalizeText(body.variant_image)
          : existingItem.variant_image || "",
      image_id:
        body?.image_id !== undefined
          ? normalizeText(body.image_id)
          : existingItem.image_id || "",
      weight:
        body?.weight !== undefined
          ? normalizeText(body.weight)
          : existingItem.weight || "",
      weight_unit:
        body?.weight_unit !== undefined
          ? normalizeText(body.weight_unit)
          : existingItem.weight_unit || "",
      box_quantity:
        body?.box_quantity !== undefined
          ? normalizeText(body.box_quantity)
          : existingItem.box_quantity || "",
      status:
        body?.status !== undefined
          ? normalizeStatus(body.status)
          : existingItem.status || "",
      updated_at: new Date().toISOString(),
    };

    const rowValues = headers.map((header) => updatedItem[header] || "");

    await updateSheetRowByRowNumber("product_variants", foundRowNumber, rowValues);

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