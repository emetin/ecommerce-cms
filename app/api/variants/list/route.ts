import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type VariantRecord = Record<string, string>;

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toSafeNumber(value: unknown, fallback = 999999) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : fallback;
}

function isPublishedLike(value: unknown) {
  const normalized = normalizeLower(value);
  return normalized === "" || normalized === "published" || normalized === "active";
}

function buildVariantSortKey(item: VariantRecord) {
  return [
    normalizeText(item.option1_value),
    normalizeText(item.option2_value),
    normalizeText(item.option3_value),
    normalizeText(item.sku),
    normalizeText(item.id),
  ].join(" | ");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const productSlug = normalizeLower(searchParams.get("product_slug"));
    const includeAll = normalizeLower(searchParams.get("include_all")) === "true";

    const rows = (await getSheetData("product_variants", {
      forceFresh: true,
      ttlSeconds: 30,
    })) as VariantRecord[];

    let items = rows.filter((item) => normalizeText(item.id));

    if (productSlug) {
      items = items.filter(
        (item) => normalizeLower(item.product_slug) === productSlug
      );
    }

    if (!includeAll) {
      const publishedItems = items.filter((item) => isPublishedLike(item.status));
      items = publishedItems.length ? publishedItems : items;
    }

    items = [...items].sort((a, b) => {
      const aBoxQty = toSafeNumber(a.box_quantity, 999999);
      const bBoxQty = toSafeNumber(b.box_quantity, 999999);

      if (aBoxQty !== bBoxQty) {
        return aBoxQty - bBoxQty;
      }

      return buildVariantSortKey(a).localeCompare(buildVariantSortKey(b));
    });

    return NextResponse.json(
      {
        ok: true,
        total: items.length,
        items: items.map((item) => ({
          id: normalizeText(item.id),
          product_slug: normalizeText(item.product_slug),
          option1_name: normalizeText(item.option1_name),
          option1_value: normalizeText(item.option1_value),
          option2_name: normalizeText(item.option2_name),
          option2_value: normalizeText(item.option2_value),
          option3_name: normalizeText(item.option3_name),
          option3_value: normalizeText(item.option3_value),
          sku: normalizeText(item.sku),
          barcode: normalizeText(item.barcode),
          price: normalizeText(item.price),
          compare_at_price: normalizeText(item.compare_at_price),
          inventory_tracker: normalizeText(item.inventory_tracker),
          inventory_policy: normalizeText(item.inventory_policy),
          fulfillment_service: normalizeText(item.fulfillment_service),
          requires_shipping: normalizeText(item.requires_shipping),
          taxable: normalizeText(item.taxable),

          // KRITIK ALANLAR
          image_id: normalizeText(item.image_id),
          variant_image: normalizeText(item.variant_image),

          weight: normalizeText(item.weight),
          weight_unit: normalizeText(item.weight_unit),
          box_quantity: normalizeText(item.box_quantity),
          status: normalizeText(item.status),
          created_at: normalizeText(item.created_at),
          updated_at: normalizeText(item.updated_at),
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load variants.",
      },
      { status: 500 }
    );
  }
}