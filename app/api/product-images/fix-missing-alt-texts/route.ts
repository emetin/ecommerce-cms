import { NextResponse } from "next/server";
import { getSheetData, getSheetHeaders } from "../../../../lib/sheets";
import { updateSheetRowById } from "../../../../lib/sheets-row-utils";
import { updateSheetRowBySlug } from "../../../../lib/sheets";
import {
  generateProductImageAltText,
  isWeakAltText,
} from "../../../../lib/alt-text";

type ProductRecord = Record<string, string>;
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

function toSafeOrder(value: unknown, fallback = 999999) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : fallback;
}

function hasOwn(obj: unknown, key: string) {
  return !!obj && typeof obj === "object" && key in obj;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const mode = normalizeText(body?.mode || "missing_only").toLowerCase();
    const requestedProductSlug = normalizeLower(body?.product_slug);

    const overwriteWeak =
      mode === "overwrite_weak" ||
      normalizeLower(body?.overwrite_weak) === "true";

    const overwriteAll =
      mode === "overwrite_all" ||
      normalizeLower(body?.overwrite_all) === "true";

    const [products, images, imageHeaders] = await Promise.all([
      getSheetData("products") as Promise<ProductRecord[]>,
      getSheetData("product_images") as Promise<ProductImageRecord[]>,
      getSheetHeaders("product_images"),
    ]);

    const productMap = new Map<string, ProductRecord>();

    for (const product of products) {
      const slug = normalizeLower(product.slug);
      if (slug) {
        productMap.set(slug, product);
      }
    }

    const grouped = new Map<string, ProductImageRecord[]>();

    for (const image of images) {
      const slug = normalizeLower(image.product_slug);
      if (!slug) continue;

      if (requestedProductSlug && slug !== requestedProductSlug) {
        continue;
      }

      if (!grouped.has(slug)) {
        grouped.set(slug, []);
      }

      grouped.get(slug)!.push(image);
    }

    for (const [, group] of grouped.entries()) {
      group.sort((a, b) => {
        const aMain = isTrue(a.is_main);
        const bMain = isTrue(b.is_main);

        if (aMain !== bMain) {
          return aMain ? -1 : 1;
        }

        return toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
      });
    }

    let updatedImages = 0;
    let updatedProducts = 0;

    const changedItems: Array<{
      id: string;
      product_slug: string;
      alt_text: string;
    }> = [];

    for (const [productSlug, group] of grouped.entries()) {
      const product = productMap.get(productSlug);
      const productTitle = normalizeText(product?.title);
      let galleryCounter = 1;
      let mainImageAlt = "";

      for (const image of group) {
        const id = normalizeText(image.id);
        if (!id) continue;

        const currentAlt = normalizeText(image.alt_text);
        const imageType = isTrue(image.is_main) ? "product" : "gallery";

        const generatedAlt = generateProductImageAltText({
          productTitle,
          productSlug,
          imageType,
          order: imageType === "gallery" ? galleryCounter : "",
        });

        if (imageType === "gallery") {
          galleryCounter += 1;
        } else {
          mainImageAlt = generatedAlt;
        }

        const shouldReplace = overwriteAll
          ? true
          : overwriteWeak
            ? isWeakAltText(currentAlt)
            : !currentAlt;

        if (!shouldReplace) {
          if (imageType === "product" && currentAlt) {
            mainImageAlt = currentAlt;
          }
          continue;
        }

        const merged: Record<string, string> = {
          ...image,
          alt_text: generatedAlt,
          updated_at: new Date().toISOString(),
        };

        const rowValues = imageHeaders.map((header) => merged[header] || "");

        await updateSheetRowById("product_images", id, rowValues);

        updatedImages += 1;
        changedItems.push({
          id,
          product_slug: productSlug,
          alt_text: generatedAlt,
        });

        if (imageType === "product") {
          mainImageAlt = generatedAlt;
        }
      }

      if (product) {
        const currentProductImageAlt = normalizeText(product.image_alt);

        const shouldUpdateProductImageAlt = overwriteAll
          ? true
          : overwriteWeak
            ? isWeakAltText(currentProductImageAlt)
            : !currentProductImageAlt;

        if (mainImageAlt && shouldUpdateProductImageAlt) {
          await updateSheetRowBySlug(
            "products",
            productSlug,
            (await getSheetHeaders("products")).map((header) => {
              if (header === "image_alt") return mainImageAlt;
              if (header === "updated_at") return new Date().toISOString();
              return hasOwn(product, header) ? product[header] || "" : "";
            })
          );

          updatedProducts += 1;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: `${updatedImages} image alt text value(s) updated. ${updatedProducts} product image_alt value(s) synced.`,
      updated_images: updatedImages,
      updated_products: updatedProducts,
      mode: overwriteAll
        ? "overwrite_all"
        : overwriteWeak
          ? "overwrite_weak"
          : "missing_only",
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