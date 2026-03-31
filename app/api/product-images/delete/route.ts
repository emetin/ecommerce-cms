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

function isTrue(value: unknown) {
  return String(value || "").trim().toLowerCase() === "true";
}

function toSafeOrder(value: unknown) {
  const num = Number(String(value || "").trim());
  return Number.isFinite(num) ? num : 999999;
}

async function syncProductMainImage(productSlug: string, imageUrl: string) {
  const products = (await getSheetData(PRODUCTS_SHEET)) as ProductItem[];

  const product = products.find(
    (item) =>
      String(item.slug || "").trim().toLowerCase() ===
      String(productSlug || "").trim().toLowerCase()
  );

  if (!product) {
    return;
  }

  const headers = await getSheetHeaders(PRODUCTS_SHEET);

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

    const allImages = (await getSheetData(PRODUCT_IMAGES_SHEET)) as ProductImageItem[];

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

    const productSlug = normalizeText(imageToDelete.product_slug).toLowerCase();
    const deletingMainImage = isTrue(imageToDelete.is_main);

    const result = await deleteSheetRowsByField(PRODUCT_IMAGES_SHEET, "id", id);

    if (deletingMainImage && productSlug) {
      const remainingImages = (
        (await getSheetData(PRODUCT_IMAGES_SHEET)) as ProductImageItem[]
      )
        .filter(
          (item) =>
            normalizeText(item.product_slug).toLowerCase() === productSlug
        )
        .sort((a, b) => {
          const aMain = isTrue(a.is_main);
          const bMain = isTrue(b.is_main);

          if (aMain !== bMain) {
            return aMain ? -1 : 1;
          }

          return toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
        });

      if (remainingImages.length > 0) {
        const nextMain = remainingImages[0];
        const now = new Date().toISOString();
        const headers = await getSheetHeaders(PRODUCT_IMAGES_SHEET);

        const refreshedImages = (await getSheetData(
          PRODUCT_IMAGES_SHEET
        )) as ProductImageItem[];

        const targetIndex = refreshedImages.findIndex(
          (item) => normalizeText(item.id) === normalizeText(nextMain.id)
        );

        if (targetIndex !== -1) {
          const updatedImage: ProductImageItem = {
            ...refreshedImages[targetIndex],
            is_main: "true",
            updated_at: now,
          };

          const rowValues = headers.map((header) => updatedImage[header] || "");
          await updateSheetRowByRowNumber(
            PRODUCT_IMAGES_SHEET,
            targetIndex + 2,
            rowValues
          );

          await syncProductMainImage(
            productSlug,
            normalizeText(updatedImage.image_url)
          );
        }
      } else {
        await syncProductMainImage(productSlug, "");
      }
    }

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