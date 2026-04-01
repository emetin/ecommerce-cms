import { NextResponse } from "next/server";
import {
  deleteSheetRowsByField,
  getSheetData,
  getSheetHeaders,
  updateSheetRowByRowNumber,
  updateSheetRowBySlug,
} from "../../../../lib/sheets";

type ProductImageItem = Record<string, string>;
type ProductItem = Record<string, string>;

const PRODUCT_IMAGES_SHEET = "product_images";
const PRODUCTS_SHEET = "products";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isTrue(value: unknown) {
  return normalizeLower(value) === "true";
}

function toSafeOrder(value: unknown) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : 999999;
}

function sortImages(items: ProductImageItem[]) {
  return [...items].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    const byOrder = toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
    if (byOrder !== 0) return byOrder;

    return normalizeText(a.id).localeCompare(normalizeText(b.id));
  });
}

async function syncProductMainImage(productSlug: string, imageUrl: string) {
  const products = (await getSheetData(PRODUCTS_SHEET, {
    forceFresh: true,
    ttlSeconds: 30,
  })) as ProductItem[];

  const product = products.find(
    (item) => normalizeLower(item.slug) === normalizeLower(productSlug)
  );

  if (!product) {
    return;
  }

  const headers = await getSheetHeaders(PRODUCTS_SHEET, {
    forceFresh: true,
    ttlSeconds: 30,
  });

  const updatedProduct: ProductItem = {
    ...product,
    image: imageUrl,
    updated_at: new Date().toISOString(),
  };

  const rowValues = headers.map((header) => updatedProduct[header] || "");
  await updateSheetRowBySlug(PRODUCTS_SHEET, productSlug, rowValues);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = normalizeText(body?.id);

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Image id is required.",
        },
        { status: 400 }
      );
    }

    const allImages = (await getSheetData(PRODUCT_IMAGES_SHEET, {
      forceFresh: true,
      ttlSeconds: 30,
    })) as ProductImageItem[];

    const imageToDelete =
      allImages.find((item) => normalizeText(item.id) === id) || null;

    if (!imageToDelete) {
      return NextResponse.json(
        {
          ok: false,
          error: "Image not found.",
        },
        { status: 404 }
      );
    }

    const productSlug = normalizeLower(imageToDelete.product_slug);
    const deletingMainImage = isTrue(imageToDelete.is_main);

    const result = await deleteSheetRowsByField(PRODUCT_IMAGES_SHEET, "id", id);

    const refreshedImages = (await getSheetData(PRODUCT_IMAGES_SHEET, {
      forceFresh: true,
      ttlSeconds: 30,
    })) as ProductImageItem[];

    const remainingImages = sortImages(
      refreshedImages.filter(
        (item) => normalizeLower(item.product_slug) === productSlug
      )
    );

    if (deletingMainImage && remainingImages.length > 0) {
      const nextMain = remainingImages[0];

      if (!isTrue(nextMain.is_main)) {
        const headers = await getSheetHeaders(PRODUCT_IMAGES_SHEET, {
          forceFresh: true,
          ttlSeconds: 30,
        });

        const targetIndex = refreshedImages.findIndex(
          (item) => normalizeText(item.id) === normalizeText(nextMain.id)
        );

        if (targetIndex !== -1) {
          const updatedImage: ProductImageItem = {
            ...refreshedImages[targetIndex],
            is_main: "true",
            updated_at: new Date().toISOString(),
          };

          const rowValues = headers.map((header) => updatedImage[header] || "");
          await updateSheetRowByRowNumber(
            PRODUCT_IMAGES_SHEET,
            targetIndex + 2,
            rowValues
          );
        }
      }
    }

    const finalImages = (await getSheetData(PRODUCT_IMAGES_SHEET, {
      forceFresh: true,
      ttlSeconds: 30,
    })) as ProductImageItem[];

    const sameProductImages = sortImages(
      finalImages.filter((item) => normalizeLower(item.product_slug) === productSlug)
    );

    const bestImage =
      sameProductImages.find((item) => isTrue(item.is_main)) ||
      sameProductImages[0] ||
      null;

    await syncProductMainImage(productSlug, normalizeText(bestImage?.image_url || ""));

    return NextResponse.json({
      ok: true,
      deleted: result.deleted || 0,
      message: "Product image deleted successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete product image.",
      },
      { status: 500 }
    );
  }
}