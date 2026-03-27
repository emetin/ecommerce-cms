"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ProductImageItem = {
  id?: string;
  product_slug?: string;
  image_url?: string;
  alt_text?: string;
  is_main?: string;
  sort_order?: string;
  created_at?: string;
  updated_at?: string;
};

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
  price?: string;
  compare_at_price?: string;
  image_id?: string;
  status?: string;
};

function buildVariantLabel(variant: VariantItem) {
  const parts = [
    String(variant.option1_value || "").trim(),
    String(variant.option2_value || "").trim(),
    String(variant.option3_value || "").trim(),
  ].filter(Boolean);

  return parts.length ? parts.join(" / ") : String(variant.sku || "Default");
}

export default function ProductImagesAdminPage() {
  const params = useParams();
  const slug = String(params?.slug || "").trim().toLowerCase();

  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingImageId, setSavingImageId] = useState("");
  const [savingVariantId, setSavingVariantId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [newImageUrl, setNewImageUrl] = useState("");
  const [newAltText, setNewAltText] = useState("");
  const [newIsMain, setNewIsMain] = useState(false);
  const [newSortOrder, setNewSortOrder] = useState("999");
  const [creating, setCreating] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");
      setMessage("");

      const [imagesRes, variantsRes] = await Promise.all([
        fetch(`/api/product-images/list?product_slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        }),
        fetch(`/api/variants/list?product_slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        }),
      ]);

      const imagesJson = await imagesRes.json();
      const variantsJson = await variantsRes.json();

      if (!imagesRes.ok || !imagesJson.ok) {
        throw new Error(imagesJson.error || "Failed to fetch images.");
      }

      if (!variantsRes.ok || !variantsJson.ok) {
        throw new Error(variantsJson.error || "Failed to fetch variants.");
      }

      setImages(imagesJson.items || []);
      setVariants(variantsJson.items || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slug) return;
    loadData();
  }, [slug]);

  const imageOptions = useMemo(() => {
    return images.map((item) => ({
      id: String(item.id || ""),
      label: `${String(item.id || "")} ${String(item.is_main || "").toLowerCase() === "true" ? "(Main)" : ""}`,
    }));
  }, [images]);

  async function handleCreateImage(e: React.FormEvent) {
    e.preventDefault();

    try {
      setCreating(true);
      setErrorMessage("");
      setMessage("");

      const response = await fetch("/api/product-images/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_slug: slug,
          image_url: newImageUrl,
          alt_text: newAltText,
          is_main: newIsMain ? "true" : "false",
          sort_order: newSortOrder,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to create image.");
      }

      setNewImageUrl("");
      setNewAltText("");
      setNewIsMain(false);
      setNewSortOrder("999");
      setMessage("Image added successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create image."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleImageUpdate(
    image: ProductImageItem,
    updates: Partial<ProductImageItem>
  ) {
    try {
      const imageId = String(image.id || "");
      setSavingImageId(imageId);
      setErrorMessage("");
      setMessage("");

      const response = await fetch("/api/product-images/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: imageId,
          product_slug: slug,
          image_url: updates.image_url ?? image.image_url ?? "",
          alt_text: updates.alt_text ?? image.alt_text ?? "",
          is_main: updates.is_main ?? image.is_main ?? "false",
          sort_order: updates.sort_order ?? image.sort_order ?? "999",
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to update image.");
      }

      setMessage("Image updated successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update image."
      );
    } finally {
      setSavingImageId("");
    }
  }

  async function handleDeleteImage(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this image?"
    );

    if (!confirmed) return;

    try {
      setSavingImageId(id);
      setErrorMessage("");
      setMessage("");

      const response = await fetch("/api/product-images/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to delete image.");
      }

      setMessage("Image deleted successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete image."
      );
    } finally {
      setSavingImageId("");
    }
  }

  async function handleVariantImageAssign(variant: VariantItem, imageId: string) {
    try {
      const variantId = String(variant.id || "");
      setSavingVariantId(variantId);
      setErrorMessage("");
      setMessage("");

      const response = await fetch("/api/variants/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: variantId,
          image_id: imageId,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to update variant image.");
      }

      setMessage("Variant image updated successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update variant image."
      );
    } finally {
      setSavingVariantId("");
    }
  }

  return (
    <section style={{ padding: "32px 0 60px" }}>
      <div style={containerStyle}>
        <div style={topBarStyle}>
          <div>
            <div style={kickerStyle}>Admin / Product Images</div>
            <h1 style={titleStyle}>Manage Product Images</h1>
            <p style={textStyle}>
              Product slug: <strong>{slug || "-"}</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={`/admin/products/${slug}`} style={secondaryButtonStyle}>
              ← Back to Product
            </Link>

            <Link href="/admin/products" style={secondaryButtonStyle}>
              All Products
            </Link>
          </div>
        </div>

        {message ? <div style={successBoxStyle}>{message}</div> : null}
        {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}

        <div style={layoutStyle}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Add New Image</div>

            <form onSubmit={handleCreateImage} style={{ display: "grid", gap: 14 }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Image URL</span>
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://..."
                  style={inputStyle}
                  required
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Alt Text</span>
                <input
                  type="text"
                  value={newAltText}
                  onChange={(e) => setNewAltText(e.target.value)}
                  placeholder="Optional alt text"
                  style={inputStyle}
                />
              </label>

              <div style={twoColStyle}>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Sort Order</span>
                  <input
                    type="number"
                    value={newSortOrder}
                    onChange={(e) => setNewSortOrder(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={checkboxWrapStyle}>
                  <input
                    type="checkbox"
                    checked={newIsMain}
                    onChange={(e) => setNewIsMain(e.target.checked)}
                  />
                  <span>Set as main image</span>
                </label>
              </div>

              <button type="submit" style={primaryButtonStyle} disabled={creating}>
                {creating ? "Adding..." : "Add Image"}
              </button>
            </form>
          </div>

          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Variant Image Assignment</div>

            {variants.length === 0 ? (
              <div style={emptyStyle}>No variants found for this product.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {variants.map((variant) => {
                  const variantId = String(variant.id || "");
                  return (
                    <div key={variantId} style={variantCardStyle}>
                      <div>
                        <div style={variantTitleStyle}>
                          {buildVariantLabel(variant)}
                        </div>
                        <div style={variantMetaStyle}>
                          SKU: {String(variant.sku || "-")}
                        </div>
                      </div>

                      <select
                        value={String(variant.image_id || "")}
                        onChange={(e) =>
                          handleVariantImageAssign(variant, e.target.value)
                        }
                        style={selectStyle}
                        disabled={savingVariantId === variantId}
                      >
                        <option value="">No image</option>
                        {imageOptions.map((image) => (
                          <option key={image.id} value={image.id}>
                            {image.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ ...cardStyle, marginTop: 24 }}>
          <div style={sectionTitleStyle}>Image Library</div>

          {loading ? (
            <div style={emptyStyle}>Loading...</div>
          ) : images.length === 0 ? (
            <div style={emptyStyle}>No images added yet.</div>
          ) : (
            <div style={gridStyle}>
              {images.map((image) => {
                const imageId = String(image.id || "");
                const isMain = String(image.is_main || "").toLowerCase() === "true";

                return (
                  <div key={imageId} style={imageCardStyle}>
                    <div style={imageWrapStyle}>
                      <img
                        src={String(image.image_url || "")}
                        alt={String(image.alt_text || "Product image")}
                        style={imageStyle}
                      />
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={metaTextStyle}>
                        <strong>ID:</strong> {imageId}
                      </div>

                      <label style={labelStyle}>
                        <span style={labelTextStyle}>Image URL</span>
                        <input
                          type="text"
                          value={String(image.image_url || "")}
                          onChange={(e) => {
                            const value = e.target.value;
                            setImages((prev) =>
                              prev.map((item) =>
                                String(item.id || "") === imageId
                                  ? { ...item, image_url: value }
                                  : item
                              )
                            );
                          }}
                          style={inputStyle}
                        />
                      </label>

                      <label style={labelStyle}>
                        <span style={labelTextStyle}>Alt Text</span>
                        <input
                          type="text"
                          value={String(image.alt_text || "")}
                          onChange={(e) => {
                            const value = e.target.value;
                            setImages((prev) =>
                              prev.map((item) =>
                                String(item.id || "") === imageId
                                  ? { ...item, alt_text: value }
                                  : item
                              )
                            );
                          }}
                          style={inputStyle}
                        />
                      </label>

                      <div style={twoColStyle}>
                        <label style={labelStyle}>
                          <span style={labelTextStyle}>Sort Order</span>
                          <input
                            type="number"
                            value={String(image.sort_order || "999")}
                            onChange={(e) => {
                              const value = e.target.value;
                              setImages((prev) =>
                                prev.map((item) =>
                                  String(item.id || "") === imageId
                                    ? { ...item, sort_order: value }
                                    : item
                                )
                              );
                            }}
                            style={inputStyle}
                          />
                        </label>

                        <label style={checkboxWrapStyle}>
                          <input
                            type="checkbox"
                            checked={isMain}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setImages((prev) =>
                                prev.map((item) =>
                                  String(item.id || "") === imageId
                                    ? {
                                        ...item,
                                        is_main: checked ? "true" : "false",
                                      }
                                    : item
                                )
                              );
                            }}
                          />
                          <span>Main image</span>
                        </label>
                      </div>

                      <div style={buttonRowStyle}>
                        <button
                          type="button"
                          style={primaryButtonStyle}
                          disabled={savingImageId === imageId}
                          onClick={() => handleImageUpdate(image, {})}
                        >
                          {savingImageId === imageId ? "Saving..." : "Save"}
                        </button>

                        <button
                          type="button"
                          style={dangerButtonStyle}
                          disabled={savingImageId === imageId}
                          onClick={() => handleDeleteImage(imageId)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const containerStyle: React.CSSProperties = {
  width: "min(1320px, calc(100% - 32px))",
  margin: "0 auto",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
  marginBottom: 24,
};

const kickerStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7b7367",
  fontWeight: 800,
  marginBottom: 8,
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 34,
  lineHeight: 1.05,
  fontWeight: 900,
  color: "#171717",
};

const textStyle: React.CSSProperties = {
  margin: 0,
  color: "#5d554a",
  lineHeight: 1.7,
};

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e7ded1",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  marginBottom: 16,
  color: "#171717",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const labelTextStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#5d554a",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  borderRadius: 14,
  border: "1px solid #ddd3c5",
  padding: "0 14px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
};

const selectStyle: React.CSSProperties = {
  minHeight: 46,
  borderRadius: 14,
  border: "1px solid #ddd3c5",
  padding: "0 14px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  minWidth: 240,
};

const checkboxWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 700,
  color: "#171717",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
  alignItems: "end",
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 48,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  padding: "0 18px",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 46,
  borderRadius: 999,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
  padding: "0 18px",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const dangerButtonStyle: React.CSSProperties = {
  minHeight: 48,
  borderRadius: 999,
  border: "1px solid #c94141",
  background: "#fff5f5",
  color: "#a61e1e",
  fontWeight: 800,
  cursor: "pointer",
  padding: "0 18px",
};

const successBoxStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 14,
  borderRadius: 16,
  background: "#eef8f0",
  border: "1px solid #cfe5d4",
  color: "#245843",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 14,
  borderRadius: 16,
  background: "#fff3f3",
  border: "1px solid #efcaca",
  color: "#8b1e1e",
  fontWeight: 700,
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#faf7f1",
  border: "1px solid #e8dece",
  color: "#5d554a",
};

const variantCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  border: "1px solid #ece2d4",
  borderRadius: 18,
  padding: 14,
  background: "#faf8f4",
};

const variantTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#171717",
  marginBottom: 4,
};

const variantMetaStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#756d61",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 18,
};

const imageCardStyle: React.CSSProperties = {
  border: "1px solid #e8dece",
  borderRadius: 22,
  padding: 16,
  background: "#fff",
  display: "grid",
  gap: 14,
};

const imageWrapStyle: React.CSSProperties = {
  borderRadius: 18,
  overflow: "hidden",
  background: "#f7f3ed",
  border: "1px solid #ece2d4",
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  display: "block",
};

const metaTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#5d554a",
  wordBreak: "break-word",
};

const buttonRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};