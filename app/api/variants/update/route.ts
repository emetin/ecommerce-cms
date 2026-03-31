import { NextResponse } from "next/server";
import {
  findRowNumberByField,
  getSheetData,
  getSheetHeaders,
  updateSheetRowByRowNumber,
} from "../../../../lib/sheets";

type VariantRecord = Record<string, string>;

const SHEET_NAME = "product_variants";
const ALLOWED_STATUS = ["published", "draft", "archived"];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeStatus(value: unknown) {
  return String(value || "draft").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const id = normalizeText(body?.id);
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
    const variantImage = normalizeText(body?.variant_image);
    const weight = normalizeText(body?.weight);
    const weightUnit = normalizeText(body?.weight_unit);
    const boxQuantity = normalizeText(body?.box_quantity);
    const status = normalizeStatus(body?.status);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Variant id is required." },
        { status: 400 }
      );
    }

    if (!productSlug) {
      return NextResponse.json(
        { ok: false, error: "Product slug is required." },
        { status: 400 }
      );
    }

    if (!option1Value) {
      return NextResponse.json(
        { ok: false, error: "Option 1 value is required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status value." },
        { status: 400 }
      );
    }

    const rowNumber = await findRowNumberByField(SHEET_NAME, "id", id);

    if (!rowNumber) {
      return NextResponse.json(
        { ok: false, error: "Variant not found." },
        { status: 404 }
      );
    }

    const existing = (await getSheetData(SHEET_NAME)) as VariantRecord[];

    const current = existing.find(
      (item) => String(item.id || "").trim() === id
    );

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Variant not found." },
        { status: 404 }
      );
    }

    const duplicate = existing.find((item) => {
      return (
        String(item.id || "").trim() !== id &&
        String(item.product_slug || "").trim().toLowerCase() === productSlug &&
        String(item.option1_value || "").trim() === option1Value &&
        String(item.option2_value || "").trim() === option2Value &&
        String(item.option3_value || "").trim() === option3Value
      );
    });

    if (duplicate) {
      return NextResponse.json(
        {
          ok: false,
          error: "Another variant with the same option combination already exists.",
        },
        { status: 400 }
      );
    }

    const headers = await getSheetHeaders(SHEET_NAME);
    const updatedAt = new Date().toISOString();

    const item: Record<string, string> = {
      ...current,
      id,
      product_slug: productSlug,
      option1_name: option1Name,
      option1_value: option1Value,
      option2_name: option2Name,
      option2_value: option2Value,
      option3_name: option3Name,
      option3_value: option3Value,
      sku,
      barcode,
      price,
      compare_at_price: compareAtPrice,
      inventory_tracker: inventoryTracker,
      inventory_policy: inventoryPolicy,
      fulfillment_service: fulfillmentService,
      requires_shipping: requiresShipping,
      taxable,
      variant_image: variantImage,
      image_id: variantImage,
      weight,
      weight_unit: weightUnit,
      box_quantity: boxQuantity,
      status,
      created_at: String(current.created_at || ""),
      updated_at: updatedAt,
    };

    const rowValues = headers.map((header) => item[header] || "");

    await updateSheetRowByRowNumber(SHEET_NAME, rowNumber, rowValues);

    return NextResponse.json({
      ok: true,
      message: "Variant updated successfully.",
      item,
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