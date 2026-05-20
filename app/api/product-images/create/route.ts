import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { generateProductImageAltText } from "../../../../lib/alt-text";

type CreateImageInput = {
  product_slug?: string;
  product_id?: string;
  image_url?: string;
  image_file_id?: string;
  image_uploaded_at?: string;
  sort_order?: string | number;
  alt_text?: string;
  is_main?: string | boolean;
};

type ProductImageRow = {
  id?: string;
  product_id?: string | null;
  image_url?: string | null;
  image_file_id?: string | null;
  alt_text?: string | null;
  sort_order?: number | string | null;
  is_main?: boolean | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isTrue(value: unknown) {
  if (typeof value === "boolean") return value;
  return normalizeLower(value) === "true";
}

function normalizeBool(value: unknown, fallback = false) {
  const normalized = normalizeLower(value);

  if (!normalized) {
    return fallback;
  }

  return normalized === "true";
}

function toSafeOrder(value: unknown, fallback = 999999) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : fallback;
}

function extractFileNameFromUrl(url: string) {
  const cleanUrl = normalizeText(url).split("?")[0].split("#")[0];
  const parts = cleanUrl.split("/");
  return parts[parts.length - 1] || "";
}

function mapImage(row: ProductImageRow, productSlug: string) {
  return {
    id: normalizeText(row.id),
    product_id: normalizeText(row.product_id),
    product_slug: productSlug,
    image_url: normalizeText(row.image_url),
    image_file_id: normalizeText(row.image_file_id),
    image_uploaded_at: normalizeText(row.created_at),
    sort_order: String(toSafeOrder(row.sort_order)),
    alt_text: normalizeText(row.alt_text),
    is_main: isTrue(row.is_main) ? "true" : "false",
    created_at: normalizeText(row.created_at),
    updated_at: normalizeText(row.updated_at),
  };
}

async function syncProductPrimaryImage(productId: string) {
  const supabase = createSupabaseAdminClient();

  const { data: images, error: imagesError } = await supabase
    .from("product_images")
    .select("image_url, is_main, sort_order, created_at")
    .eq("product_id", productId)
    .order("is_main", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (imagesError) {
    throw new Error(imagesError.message);
  }

  const primaryImage = normalizeText(images?.[0]?.image_url);

  const { error: productError } = await supabase
    .from("products")
    .update({
      image_url: primaryImage || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (productError) {
    throw new Error(productError.message);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const itemsInput: CreateImageInput[] = Array.isArray((body as any).items)
      ? (body as any).items
      : [body as CreateImageInput];

    if (!itemsInput.length) {
      return NextResponse.json(
        { ok: false, error: "No image items were provided." },
        { status: 400 }
      );
    }

    const firstItem = itemsInput[0] || {};
    const productSlug = normalizeLower(
      (body as any).product_slug || firstItem.product_slug
    );
    let productId = normalizeText((body as any).product_id || firstItem.product_id);

    if (!productSlug && !productId) {
      return NextResponse.json(
        { ok: false, error: "product_slug or product_id is required." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    let productTitle = "";

    if (productId) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, title, slug")
        .eq("id", productId)
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

      productId = normalizeText(product.id);
      productTitle = normalizeText(product.title);
    } else {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, title, slug")
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

      productId = normalizeText(product.id);
      productTitle = normalizeText(product.title);
    }

    const { data: existingImages, error: existingImagesError } = await supabase
      .from("product_images")
      .select("id, sort_order, is_main")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });

    if (existingImagesError) {
      throw new Error(existingImagesError.message);
    }

    const hasAnyExistingImages = Boolean(existingImages?.length);
    const requestedAnyMain = itemsInput.some((item) => isTrue(item.is_main));

    if (requestedAnyMain || !hasAnyExistingImages) {
      const { error: clearError } = await supabase
        .from("product_images")
        .update({
          is_main: false,
          updated_at: new Date().toISOString(),
        })
        .eq("product_id", productId);

      if (clearError) {
        throw new Error(clearError.message);
      }
    }

    const baseMaxOrder =
      existingImages && existingImages.length > 0
        ? Math.max(
            ...existingImages.map((item) => toSafeOrder(item.sort_order, 0))
          )
        : 0;

    const now = new Date().toISOString();

    const rows = itemsInput.map((item, index) => {
      const imageUrl = normalizeText(item.image_url);
      const fileId =
        normalizeText(item.image_file_id) || extractFileNameFromUrl(imageUrl);

      if (!imageUrl) {
        throw new Error(`image_url is required for item ${index + 1}.`);
      }

      const requestedIsMain = normalizeBool(item.is_main, false);
      const finalIsMain =
        requestedIsMain ||
        (!hasAnyExistingImages && index === 0 && !requestedAnyMain);

      const sortOrder = normalizeText(item.sort_order)
        ? toSafeOrder(item.sort_order, baseMaxOrder + index + 1)
        : baseMaxOrder + index + 1;

      const altText =
        normalizeText(item.alt_text) ||
        generateProductImageAltText({
          productTitle,
          productSlug,
          imageType: finalIsMain ? "product" : "gallery",
          order: finalIsMain ? "" : String(sortOrder),
        });

      return {
        product_id: productId,
        image_url: imageUrl,
        image_file_id: fileId || null,
        alt_text: altText,
        sort_order: sortOrder,
        is_main: finalIsMain,
        created_at: now,
        updated_at: now,
      };
    });

    const { data: createdRows, error: insertError } = await supabase
      .from("product_images")
      .insert(rows)
      .select("*");

    if (insertError) {
      throw new Error(insertError.message);
    }

    await syncProductPrimaryImage(productId);

    const createdItems = ((createdRows || []) as ProductImageRow[]).map((row) =>
      mapImage(row, productSlug)
    );

    return NextResponse.json(
      {
        ok: true,
        message:
          createdItems.length === 1
            ? "Product image created successfully."
            : `${createdItems.length} product images created successfully.`,
        item: createdItems[0],
        items: createdItems,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create product images.",
      },
      { status: 500 }
    );
  }
}