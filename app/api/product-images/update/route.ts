import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

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
  products?: {
    slug?: string | null;
  } | null;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isTrue(value: unknown) {
  if (typeof value === "boolean") return value;
  return normalizeLower(value) === "true";
}

function normalizeBool(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeLower(value);

  if (!normalized) {
    return fallback;
  }

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
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

async function getProductSlugById(productId: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeText(data?.slug);
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

    const id = normalizeText((body as any).id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id is required." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: current, error: currentError } = await supabase
      .from("product_images")
      .select(
        `
        id,
        product_id,
        image_url,
        image_file_id,
        alt_text,
        sort_order,
        is_main,
        created_at,
        updated_at,
        products (
          slug
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (currentError) {
      throw new Error(currentError.message);
    }

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Product image not found." },
        { status: 404 }
      );
    }

    const currentRow = current as ProductImageRow;
    let productId = normalizeText(currentRow.product_id);
    let productSlug = normalizeText(currentRow.products?.slug);

    const requestedProductSlug = normalizeLower((body as any).product_slug);
    const requestedProductId = normalizeText((body as any).product_id);

    if (requestedProductId && requestedProductId !== productId) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, slug")
        .eq("id", requestedProductId)
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
      productSlug = normalizeText(product.slug);
    } else if (requestedProductSlug && requestedProductSlug !== productSlug) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, slug")
        .eq("slug", requestedProductSlug)
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
      productSlug = normalizeText(product.slug);
    }

    const nextImageUrl = normalizeText(
      (body as any).image_url || currentRow.image_url
    );

    const nextImageFileId =
      normalizeText((body as any).image_file_id) ||
      normalizeText(currentRow.image_file_id) ||
      extractFileNameFromUrl(nextImageUrl);

    const nextAltText = normalizeText(
      (body as any).alt_text || currentRow.alt_text
    );

    const nextSortOrder = normalizeText((body as any).sort_order)
      ? toSafeOrder((body as any).sort_order)
      : toSafeOrder(currentRow.sort_order, 0);

    const nextIsMain = normalizeBool(
      (body as any).is_main,
      isTrue(currentRow.is_main)
    );

    const now = new Date().toISOString();

    if (nextIsMain) {
      const { error: clearError } = await supabase
        .from("product_images")
        .update({
          is_main: false,
          updated_at: now,
        })
        .eq("product_id", productId)
        .neq("id", id);

      if (clearError) {
        throw new Error(clearError.message);
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("product_images")
      .update({
        product_id: productId,
        image_url: nextImageUrl,
        image_file_id: nextImageFileId || null,
        alt_text: nextAltText || null,
        sort_order: nextSortOrder,
        is_main: nextIsMain,
        updated_at: now,
      })
      .eq("id", id)
      .select(
        `
        id,
        product_id,
        image_url,
        image_file_id,
        alt_text,
        sort_order,
        is_main,
        created_at,
        updated_at,
        products (
          slug
        )
      `
      )
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    await syncProductPrimaryImage(productId);

    const finalProductSlug =
      normalizeText((updated as ProductImageRow).products?.slug) ||
      productSlug ||
      (productId ? await getProductSlugById(productId) : "");

    return NextResponse.json({
      ok: true,
      message: "Product image updated successfully.",
      item: mapImage(updated as ProductImageRow, finalProductSlug),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update product image.",
      },
      { status: 500 }
    );
  }
}