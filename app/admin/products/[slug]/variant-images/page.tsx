"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { normalizeImageUrl } from "../../../../../lib/image-url";

type VariantItem = {
  id?: string;
  product_slug?: string;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  sku?: string;
  variant_image?: string;
  image_id?: string;
  status?: string;
};

type ProductImageItem = {
  id?: string;
  product_slug?: string;
  image_url?: string;
  alt_text?: string;
  sort_order?: string;
  is_main?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function isTrue(value?: string) {
  return String(value || "").trim().toLowerCase() === "true";
}

function toSafeOrder(value?: string) {
  const num = Number(String(value || "").trim());
  return Number.isFinite(num) ? num : 999999;
}

function buildVariantLabel(item: VariantItem) {
  const values = [item.option1_value, item.option2_value, item.option3_value]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  return values.length ? values.join(" / ") : "Default";
}

function sortImages(images: ProductImageItem[]) {
  return [...images].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    return toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
  });
}

export default function VariantImagesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = use(params);
  const slug = decodeURIComponent(rawSlug);

  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [variantResponse, imageResponse] = await Promise.all([
        fetch(`/api/variants/list?product_slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        }),
        fetch(`/api/product-images/list?product_slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        }),
      ]);

      const variantData = await variantResponse.json();
      const imageData = await imageResponse.json();

      if (!variantResponse.ok || !variantData.ok) {
        throw new Error(variantData?.error || "Failed to load variants.");
      }

      if (!imageResponse.ok || !imageData.ok) {
        throw new Error(imageData?.error || "Failed to load product images.");
      }

      setVariants(Array.isArray(variantData.items) ? variantData.items : []);
      setImages(sortImages(Array.isArray(imageData.items) ? imageData.items : []));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [slug]);

  const imageOptions = useMemo(() => sortImages(images), [images]);

  async function handleAssignImage(variant: VariantItem, imageId: string) {
    const variantId = normalizeText(variant.id);

    if (!variantId) {
      setErrorMessage("Variant id is missing.");
      return;
    }

    const selectedImage =
      imageOptions.find(
        (item) => normalizeText(item.id) === normalizeText(imageId)
      ) || null;

    if (!selectedImage) {
      setErrorMessage("Selected image could not be found.");
      return;
    }

    const nextImageId = normalizeText(selectedImage.id);
    const nextImageUrl = normalizeText(selectedImage.image_url);

    try {
      setSavingId(variantId);
      setMessage("");
      setErrorMessage("");

      // Optimistic UI update
      setVariants((prev) =>
        prev.map((item) =>
          normalizeText(item.id) === variantId
            ? {
                ...item,
                image_id: nextImageId,
                variant_image: nextImageUrl,
              }
            : item
        )
      );

      const response = await fetch("/api/variants/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: variantId,
          image_id: nextImageId,
          variant_image: nextImageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to assign variant image.");
      }

      setMessage("Variant image updated successfully.");

      // Re-sync from server after successful save
      await loadData();
    } catch (error) {
      // Roll back by reloading real data
      await loadData();

      setErrorMessage(
        error instanceof Error ? error.message : "Failed to assign variant image."
      );
    } finally {
      setSavingId("");
    }
  }

  async function handleClearImage(variant: VariantItem) {
    const variantId = normalizeText(variant.id);

    if (!variantId) {
      setErrorMessage("Variant id is missing.");
      return;
    }

    try {
      setSavingId(variantId);
      setMessage("");
      setErrorMessage("");

      // Optimistic clear
      setVariants((prev) =>
        prev.map((item) =>
          normalizeText(item.id) === variantId
            ? {
                ...item,
                image_id: "",
                variant_image: "",
              }
            : item
        )
      );

      const response = await fetch("/api/variants/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: variantId,
          image_id: "",
          variant_image: "",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to clear variant image.");
      }

      setMessage("Variant image cleared successfully.");
      await loadData();
    } catch (error) {
      await loadData();

      setErrorMessage(
        error instanceof Error ? error.message : "Failed to clear variant image."
      );
    } finally {
      setSavingId("");
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={pageHeaderStyle}>
        <div>
          <Link href={`/admin/products/${slug}`} style={backLinkStyle}>
            ← Back to Product
          </Link>
          <h1 style={titleStyle}>Variant Image Binding</h1>
          <p style={subtitleStyle}>
            Connect gallery images to product variants.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={cardStyle}>Loading...</div>
      ) : errorMessage ? (
        <div style={errorBoxStyle}>{errorMessage}</div>
      ) : variants.length === 0 ? (
        <div style={emptyStateStyle}>No variants found for this product.</div>
      ) : images.length === 0 ? (
        <div style={emptyStateStyle}>
          No gallery images found. Add product images first.
        </div>
      ) : (
        <div style={listStyle}>
          {variants.map((variant) => {
            const currentVariantId = normalizeText(variant.id);
            const currentImageId = normalizeText(variant.image_id);
            const currentImageUrl = normalizeText(variant.variant_image);

            return (
              <div key={variant.id} style={variantCardStyle}>
                <div style={variantHeaderStyle}>
                  <div>
                    <div style={variantTitleStyle}>{buildVariantLabel(variant)}</div>
                    <div style={variantMetaStyle}>SKU: {variant.sku || "-"}</div>
                  </div>

                  <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
                    {currentImageUrl ? (
                      <img
                        src={normalizeImageUrl(currentImageUrl)}
                        alt={buildVariantLabel(variant)}
                        style={selectedImageStyle}
                      />
                    ) : (
                      <div style={selectedImageEmptyStyle}>No Image</div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleClearImage(variant)}
                      style={clearButtonStyle}
                      disabled={savingId === currentVariantId}
                    >
                      {savingId === currentVariantId ? "Saving..." : "Clear"}
                    </button>
                  </div>
                </div>

                <div style={imagePickerGridStyle}>
                  {imageOptions.map((image, index) => {
                    const imageId = normalizeText(image.id);
                    const active = imageId === currentImageId;

                    return (
                      <button
                        key={image.id || `${image.image_url}-${index}`}
                        type="button"
                        onClick={() => handleAssignImage(variant, imageId)}
                        style={{
                          ...imageOptionButtonStyle,
                          ...(active ? activeImageOptionButtonStyle : null),
                        }}
                        disabled={savingId === currentVariantId}
                      >
                        <img
                          src={normalizeImageUrl(image.image_url || "")}
                          alt={image.alt_text || `Image ${image.sort_order || "-"}`}
                          style={imageOptionImageStyle}
                        />
                        <div style={imageOptionMetaStyle}>
                          {image.alt_text || `Image ${image.sort_order || "-"}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {message ? <div style={successBoxStyle}>{message}</div> : null}
    </div>
  );
}

const pageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  color: "#5e5448",
  fontWeight: 700,
  marginBottom: 4,
};

const titleStyle: React.CSSProperties = {
  fontSize: 38,
  lineHeight: 1.1,
  margin: "10px 0 10px",
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#6f6559",
  fontSize: 16,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: 20,
};

const variantCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const variantHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  marginBottom: 18,
  flexWrap: "wrap",
};

const variantTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
};

const variantMetaStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#6f6559",
  fontSize: 14,
};

const selectedImageStyle: React.CSSProperties = {
  width: 96,
  height: 96,
  objectFit: "cover",
  borderRadius: 14,
  border: "1px solid #e8dfd2",
  background: "#f5f5f5",
};

const selectedImageEmptyStyle: React.CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: 14,
  border: "1px dashed #d8cdbd",
  background: "#faf8f4",
  color: "#8c8174",
  fontWeight: 700,
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};

const imagePickerGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: 14,
};

const imageOptionButtonStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 10,
  borderRadius: 16,
  border: "1px solid #e8dfd2",
  background: "#fcfbf8",
  cursor: "pointer",
};

const activeImageOptionButtonStyle: React.CSSProperties = {
  border: "2px solid #2f7d62",
  background: "#f4fbf7",
};

const imageOptionImageStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  borderRadius: 12,
  background: "#f5f5f5",
};

const imageOptionMetaStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: "#5f564c",
  fontWeight: 700,
  wordBreak: "break-word",
};

const clearButtonStyle: React.CSSProperties = {
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid #e2d6c7",
  background: "#fff",
  color: "#5f564c",
  fontWeight: 700,
  cursor: "pointer",
};

const successBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 16,
  background: "#eef8f0",
  border: "1px solid #cfe5d4",
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #efc9c9",
  color: "#7a2222",
};

const emptyStateStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#f8f5ef",
};