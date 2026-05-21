import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import {
  generateProductImageAltText,
  isWeakAltText,
} from "../../../../lib/alt-text";

type ProductRow = {
  id?: string | null;
  title?: string | null;
  slug?: string | null;
  image_alt?: string | null;
};

type ProductImageRow = {
  id?: string | null;
  product_id?: string | null;
  image_url?: string | null;
  image_file_id?: string | null;
  alt_text?: string | null;
  sort_order?: number | string | null;
  is_main?: boolean | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  products?: {
    id?: string | null;
    title?: string | null;
    slug?: string | null;
    image_alt?: string | null;
  } | null;
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

function toSafeOrder(value: unknown, fallback = 999999) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : fallback;
}

function shouldReplaceAltText(params: {
  currentAltText: unknown;
  overwriteAll: boolean;
  overwriteWeak: boolean;
}) {
  if (params.overwriteAll) {
    return true;
  }

  if (params.overwriteWeak) {
    return isWeakAltText(params.currentAltText);
  }

  return !normalizeText(params.currentAltText);
}

function getMode(body: any) {
  const mode = normalizeLower(body?.mode || "missing_only");

  const overwriteWeak =
    mode === "overwrite_weak" || normalizeLower(body?.overwrite_weak) === "true";

  const overwriteAll =
    mode === "overwrite_all" || normalizeLower(body?.overwrite_all) === "true";

  return {
    mode: overwriteAll
      ? "overwrite_all"
      : overwriteWeak
        ? "overwrite_weak"
        : "missing_only",
    overwriteWeak,
    overwriteAll,
  };
}

function sortImages(images: ProductImageRow[]) {
  return [...images].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    const orderDiff = toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return normalizeText(a.created_at).localeCompare(normalizeText(b.created_at));
  });
}

function mapChangedItem(params: {
  id: string;
  productId: string;
  productSlug: string;
  altText: string;
}) {
  return {
    id: params.id,
    product_id: params.productId,
    product_slug: params.productSlug,
    alt_text: params.altText,
  };
}

async function fetchTargetImages(params: {
  productSlug: string;
  productId: string;
}) {
  const supabase = createSupabaseAdminClient();

  let query = supabase.from("product_images").select(`
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
        id,
        title,
        slug,
        image_alt
      )
    `);

  if (params.productId) {
    query = query.eq("product_id", params.productId);
  }

  if (params.productSlug) {
    query = query.eq("products.slug", params.productSlug);
  }

  const { data, error } = await query
    .order("is_main", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as ProductImageRow[]).filter((image) => {
    const product = image.products;

    if (!product?.id) {
      return false;
    }

    if (params.productSlug && normalizeLower(product.slug) !== params.productSlug) {
      return false;
    }

    if (params.productId && normalizeText(product.id) !== params.productId) {
      return false;
    }

    return true;
  });
}

async function updateProductImageAltText(params: {
  id: string;
  altText: string;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("product_images")
    .update({
      alt_text: params.altText,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  if (error) {
    throw new Error(error.message);
  }
}

async function updateProductImageAlt(params: {
  productId: string;
  altText: string;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("products")
    .update({
      image_alt: params.altText,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.productId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const requestedProductSlug = normalizeLower(body?.product_slug);
    const requestedProductId = normalizeText(body?.product_id);

    const { mode, overwriteWeak, overwriteAll } = getMode(body);

    const images = await fetchTargetImages({
      productSlug: requestedProductSlug,
      productId: requestedProductId,
    });

    const groupedImages = new Map<string, ProductImageRow[]>();

    for (const image of images) {
      const productId = normalizeText(image.product_id || image.products?.id);

      if (!productId) {
        continue;
      }

      if (!groupedImages.has(productId)) {
        groupedImages.set(productId, []);
      }

      groupedImages.get(productId)!.push(image);
    }

    let updatedImages = 0;
    let updatedProducts = 0;

    const changedItems: Array<{
      id: string;
      product_id: string;
      product_slug: string;
      alt_text: string;
    }> = [];

    for (const [productId, productImages] of groupedImages.entries()) {
      const sortedImages = sortImages(productImages);
      const firstImage = sortedImages[0];
      const product = firstImage?.products;

      const productTitle = normalizeText(product?.title);
      const productSlug = normalizeLower(product?.slug);

      let galleryCounter = 1;
      let mainImageAltText = "";
      let currentProductImageAlt = normalizeText(product?.image_alt);

      for (const image of sortedImages) {
        const imageId = normalizeText(image.id);

        if (!imageId) {
          continue;
        }

        const currentAltText = normalizeText(image.alt_text);
        const imageType = isTrue(image.is_main) ? "product" : "gallery";

        const generatedAltText = generateProductImageAltText({
          productTitle,
          productSlug,
          imageType,
          order: imageType === "gallery" ? galleryCounter : "",
        });

        if (imageType === "gallery") {
          galleryCounter += 1;
        }

        const shouldReplace = shouldReplaceAltText({
          currentAltText,
          overwriteAll,
          overwriteWeak,
        });

        if (imageType === "product") {
          mainImageAltText = shouldReplace ? generatedAltText : currentAltText;
        }

        if (!shouldReplace) {
          continue;
        }

        await updateProductImageAltText({
          id: imageId,
          altText: generatedAltText,
        });

        updatedImages += 1;

        changedItems.push(
          mapChangedItem({
            id: imageId,
            productId,
            productSlug,
            altText: generatedAltText,
          })
        );
      }

      if (!mainImageAltText && sortedImages.length > 0) {
        const fallbackMainImage =
          sortedImages.find((image) => isTrue(image.is_main)) || sortedImages[0];

        const fallbackCurrentAltText = normalizeText(fallbackMainImage.alt_text);

        mainImageAltText =
          fallbackCurrentAltText ||
          generateProductImageAltText({
            productTitle,
            productSlug,
            imageType: "product",
            order: "",
          });
      }

      const shouldUpdateProductImageAlt = shouldReplaceAltText({
        currentAltText: currentProductImageAlt,
        overwriteAll,
        overwriteWeak,
      });

      if (mainImageAltText && shouldUpdateProductImageAlt) {
        await updateProductImageAlt({
          productId,
          altText: mainImageAltText,
        });

        currentProductImageAlt = mainImageAltText;
        updatedProducts += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `${updatedImages} image alt text value(s) updated. ${updatedProducts} product image_alt value(s) synced.`,
      updated_images: updatedImages,
      updated_products: updatedProducts,
      mode,
      product_slug: requestedProductSlug,
      product_id: requestedProductId,
      items: changedItems,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fix image alt texts.",
      },
      { status: 500 }
    );
  }
}