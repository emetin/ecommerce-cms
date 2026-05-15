import { NextResponse } from "next/server";
import { getProductBySlug } from "../../../../../lib/db/products";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function mapProductForLegacyAdmin(product: any) {
  return {
    id: product.id || "",
    title: product.title || "",
    slug: product.slug || "",
    description: product.description || "",
    short_description: product.short_description || "",
    image: product.image_url || product.image || "",
    gallery: "",
    collection_slug: product.collections?.[0]?.slug || "",
    status: product.status || "draft",
    featured: String(Boolean(product.featured)),
    seo_title: product.seo_title || "",
    seo_description: product.seo_description || "",
    vendor: product.vendor || "",
    product_category: product.product_category || "",
    type: product.product_type || "",
    product_type: product.product_type || "",
    tags: product.tags || "",
    base_price: product.base_price,
    compare_at_price: product.compare_at_price,
    currency: product.currency || "USD",
    box_quantity: product.box_quantity,
    min_order_quantity: product.min_order_quantity,
    quantity_step: product.quantity_step,
    created_at: product.created_at || "",
    updated_at: product.updated_at || "",
  };
}

function mapVariantForLegacyAdmin(variant: any) {
  return {
    id: variant.id || "",
    product_id: variant.product_id || "",
    product_slug: "",
    title: variant.title || "Default Title",
    option1_name: variant.option1_name || "",
    option1_value: variant.option1_value || "",
    option2_name: variant.option2_name || "",
    option2_value: variant.option2_value || "",
    option3_name: variant.option3_name || "",
    option3_value: variant.option3_value || "",
    sku: variant.sku || "",
    barcode: variant.barcode || "",
    price:
      variant.price === null || variant.price === undefined
        ? ""
        : String(variant.price),
    compare_at_price:
      variant.compare_at_price === null ||
      variant.compare_at_price === undefined
        ? ""
        : String(variant.compare_at_price),
    inventory_tracker: variant.inventory_tracker || "",
    inventory_policy: variant.inventory_policy || "",
    fulfillment_service: variant.fulfillment_service || "",
    requires_shipping: String(Boolean(variant.requires_shipping)),
    taxable: String(Boolean(variant.taxable)),
    image_id: variant.image_file_id || "",
    variant_image: variant.image_url || "",
    weight:
      variant.weight === null || variant.weight === undefined
        ? ""
        : String(variant.weight),
    weight_unit: variant.weight_unit || "",
    box_quantity:
      variant.box_quantity === null || variant.box_quantity === undefined
        ? ""
        : String(variant.box_quantity),
    min_order_quantity:
      variant.min_order_quantity === null ||
      variant.min_order_quantity === undefined
        ? ""
        : String(variant.min_order_quantity),
    quantity_step:
      variant.quantity_step === null || variant.quantity_step === undefined
        ? ""
        : String(variant.quantity_step),
    status: variant.status || "active",
    created_at: variant.created_at || "",
    updated_at: variant.updated_at || "",
  };
}

function mapImageForLegacyAdmin(image: any) {
  return {
    id: image.id || "",
    product_id: image.product_id || "",
    image_url: image.image_url || "",
    image_file_id: image.image_file_id || "",
    alt_text: image.alt_text || "",
    sort_order: String(image.sort_order || 0),
    is_main: String(Boolean(image.is_main)),
    created_at: image.created_at || "",
    updated_at: image.updated_at || "",
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = normalizeText(searchParams.get("slug"));

    if (!slug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product slug is required.",
        },
        { status: 400 }
      );
    }

    const product = await getProductBySlug({ slug });

    if (!product) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: {
        product: mapProductForLegacyAdmin(product),
        variants: Array.isArray(product.variants)
          ? product.variants.map(mapVariantForLegacyAdmin)
          : [],
        product_images: Array.isArray(product.images)
          ? product.images.map(mapImageForLegacyAdmin)
          : [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load product detail.",
      },
      { status: 500 }
    );
  }
}