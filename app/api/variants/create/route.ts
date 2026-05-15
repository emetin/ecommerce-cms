import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

const ALLOWED_VARIANT_STATUSES = ["active", "draft", "archived", "published"];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function parseNumber(value: unknown) {
  const text = normalizeText(value).replace(/[$,]/g, "");

  if (!text) return null;

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function parseInteger(value: unknown) {
  const number = Number(normalizeText(value));

  return Number.isInteger(number) && number > 0 ? number : null;
}

function parseBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;

  const normalized = normalizeLower(value);

  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;

  return fallback;
}

function nullIfEmpty(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

function buildVariantTitle(body: any) {
  const values = [
    body?.option1_value,
    body?.option2_value,
    body?.option3_value,
  ]
    .map(normalizeText)
    .filter(Boolean);

  return values.length > 0 ? values.join(" / ") : "Default Title";
}

function normalizeVariantStatus(value: unknown) {
  const status = normalizeLower(value || "active");

  if (status === "published") return "active";
  if (ALLOWED_VARIANT_STATUSES.includes(status)) return status;

  return "active";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const productSlug = normalizeLower(body?.product_slug);
    const price = parseNumber(body?.price);

    if (!productSlug) {
      return NextResponse.json(
        { ok: false, error: "Product slug is required." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        "id, slug, box_quantity, min_order_quantity, quantity_step, base_price"
      )
      .eq("slug", productSlug)
      .maybeSingle();

    if (productError) {
      throw new Error(productError.message);
    }

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    const boxQuantity =
      parseInteger(body?.box_quantity) ||
      Number(product.box_quantity) ||
      1;

    const variantPayload = {
      product_id: product.id,
      title: buildVariantTitle(body),
      sku: nullIfEmpty(body?.sku),
      barcode: nullIfEmpty(body?.barcode),
      option1_name: nullIfEmpty(body?.option1_name),
      option1_value: nullIfEmpty(body?.option1_value),
      option2_name: nullIfEmpty(body?.option2_name),
      option2_value: nullIfEmpty(body?.option2_value),
      option3_name: nullIfEmpty(body?.option3_name),
      option3_value: nullIfEmpty(body?.option3_value),
      price,
      compare_at_price: parseNumber(body?.compare_at_price),
      inventory_tracker: nullIfEmpty(body?.inventory_tracker),
      inventory_policy: nullIfEmpty(body?.inventory_policy) || "deny",
      fulfillment_service: nullIfEmpty(body?.fulfillment_service) || "manual",
      requires_shipping: parseBoolean(body?.requires_shipping, true),
      taxable: parseBoolean(body?.taxable, true),
      variant_image_url: nullIfEmpty(body?.variant_image || body?.image_url),
      variant_image_file_id: nullIfEmpty(body?.image_id),
      weight: parseNumber(body?.weight),
      weight_unit: nullIfEmpty(body?.weight_unit),
      box_quantity: boxQuantity,
      min_order_quantity: boxQuantity,
      quantity_step: boxQuantity,
      status: normalizeVariantStatus(body?.status),
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .insert(variantPayload)
      .select("*")
      .single();

    if (variantError) {
      throw new Error(variantError.message);
    }

    if (price !== null) {
      const { data: variants } = await supabase
        .from("product_variants")
        .select("price, compare_at_price")
        .eq("product_id", product.id)
        .eq("status", "active")
        .not("price", "is", null);

      const prices = (variants || [])
        .map((item) => Number(item.price))
        .filter((value) => Number.isFinite(value));

      const comparePrices = (variants || [])
        .map((item) => Number(item.compare_at_price))
        .filter((value) => Number.isFinite(value));

      await supabase
        .from("products")
        .update({
          base_price: prices.length ? Math.min(...prices) : price,
          compare_at_price: comparePrices.length
            ? Math.min(...comparePrices)
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);
    }

    return NextResponse.json({
      ok: true,
      item: variant,
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