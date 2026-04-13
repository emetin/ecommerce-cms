import { NextResponse } from "next/server";
import { getSheetData } from "../../../../../lib/sheets";

type ProductRecord = Record<string, string>;
type VariantRecord = Record<string, string>;
type ProductImageRecord = Record<string, string>;

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isTrue(value: unknown) {
  return normalizeLower(value) === "true";
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

function toProductItem(item: ProductRecord) {
  return {
    id: normalizeText(item.id),
    title: normalizeText(item.title),
    slug: normalizeText(item.slug),
    description: normalizeText(item.description),
    short_description: normalizeText(item.short_description),
    image: normalizeText(item.image),
    gallery: normalizeText(item.gallery),
    collection_slug: normalizeText(item.collection_slug),
    status: normalizeText(item.status),
    featured: normalizeText(item.featured || "false"),
    seo_title: normalizeText(item.seo_title),
    seo_description: normalizeText(item.seo_description),
    created_at: normalizeText(item.created_at),
    updated_at: normalizeText(item.updated_at),
    vendor: normalizeText(item.vendor),
    product_category: normalizeText(item.product_category),
    type: normalizeText(item.type),
    tags: normalizeText(item.tags),
  };
}

function toVariantItem(item: VariantRecord) {
  return {
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
    image_id: normalizeText(item.image_id),
    variant_image: normalizeText(item.variant_image),
    weight: normalizeText(item.weight),
    weight_unit: normalizeText(item.weight_unit),
    box_quantity: normalizeText(item.box_quantity),
    status: normalizeText(item.status),
    created_at: normalizeText(item.created_at),
    updated_at: normalizeText(item.updated_at),
  };
}

function toProductImageItem(item: ProductImageRecord) {
  return {
    id: normalizeText(item.id),
    product_slug: normalizeText(item.product_slug),
    image_url: normalizeText(item.image_url),
    sort_order: normalizeText(item.sort_order),
    alt_text: normalizeText(item.alt_text),
    is_main: normalizeText(item.is_main),
    created_at: normalizeText(item.created_at),
    updated_at: normalizeText(item.updated_at),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = normalizeLower(searchParams.get("slug"));

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing product slug." },
        { status: 400 }
      );
    }

    const [products, variantsRaw, productImagesRaw] = await Promise.all([
      getSheetData("products", { ttlSeconds: 300 }) as Promise<ProductRecord[]>,
      getSheetData("product_variants", {
        forceFresh: true,
        ttlSeconds: 30,
      }) as Promise<VariantRecord[]>,
      getSheetData("product_images", { ttlSeconds: 120 }) as Promise<ProductImageRecord[]>,
    ]);

    const product =
      products.find((item) => normalizeLower(item.slug) === slug) || null;

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    let variants = variantsRaw
      .filter((item) => normalizeText(item.id))
      .filter((item) => normalizeLower(item.product_slug) === slug);

    const publishedVariants = variants.filter((item) => isPublishedLike(item.status));
    variants = publishedVariants.length ? publishedVariants : variants;

    variants = [...variants].sort((a, b) => {
      const aBoxQty = toSafeNumber(a.box_quantity, 999999);
      const bBoxQty = toSafeNumber(b.box_quantity, 999999);

      if (aBoxQty !== bBoxQty) {
        return aBoxQty - bBoxQty;
      }

      return buildVariantSortKey(a).localeCompare(buildVariantSortKey(b));
    });

    const productImages = productImagesRaw
      .filter((item) => normalizeLower(item.product_slug) === slug)
      .sort((a, b) => {
        const aMain = isTrue(a.is_main);
        const bMain = isTrue(b.is_main);

        if (aMain !== bMain) {
          return aMain ? -1 : 1;
        }

        return toSafeNumber(a.sort_order, 999999) - toSafeNumber(b.sort_order, 999999);
      });

    return NextResponse.json(
      {
        ok: true,
        item: {
          product: toProductItem(product),
          variants: variants.map(toVariantItem),
          product_images: productImages.map(toProductImageItem),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load admin product detail.",
      },
      { status: 500 }
    );
  }
}