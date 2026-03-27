import { NextResponse } from "next/server";
import {
  appendSheetRow,
  getSheetData,
  getSheetHeaders,
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

function buildVariantId() {
  return `var_${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

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
    const status = normalizeStatus(body?.status);

    if (!productSlug) {
      return NextResponse.json(
        { ok: false, error: "Product slug is required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status value." },
        { status: 400 }
      );
    }

    const existing = (await getSheetData(SHEET_NAME)) as VariantRecord[];

    const duplicate = existing.find((item) => {
      return (
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
          error: "A variant with the same option combination already exists.",
        },
        { status: 400 }
      );
    }

    const headers = await getSheetHeaders(SHEET_NAME);
    const now = new Date().toISOString();

    const item: Record<string, string> = {
      id: buildVariantId(),
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
      image_id: imageId,
      weight,
      weight_unit: weightUnit,
      box_quantity: boxQuantity,
      status,
      created_at: now,
      updated_at: now,
    };

    const rowValues = headers.map((header) => item[header] || "");

    await appendSheetRow(SHEET_NAME, rowValues);

    return NextResponse.json({
      ok: true,
      message: "Variant created successfully.",
      item,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to create variant.",
      },
      { status: 500 }
    );
  }
}