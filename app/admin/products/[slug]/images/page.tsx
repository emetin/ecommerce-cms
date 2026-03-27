"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { normalizeImageUrl } from "../../../../../lib/image-url";

type ProductImageItem = {
  id?: string;
  product_slug?: string;
  image_url?: string;
  sort_order?: string;
  alt_text?: string;
  created_at?: string;
  updated_at?: string;
};

export default function AdminProductImagesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = use(params);
  const slug = decodeURIComponent(rawSlug);

  const [items, setItems] = useState<ProductImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [altText, setAltText] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [deleteLoadingId, setDeleteLoadingId] = useState("");
  const [fileUploading, setFileUploading] = useState(false);

  async function loadImages() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(
        `/api/product-images/list?product_slug=${encodeURIComponent(slug)}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load product images.");
      }

      setItems(data.items || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadImages();
  }, [slug]);

  async function handleFileUpload(file: File) {
    try {
      setFileUploading(true);
      setSaveError("");
      setSaveMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Upload failed.");
      }

      setImageUrl(data.url || "");
      setSaveMessage("Image uploaded successfully. Save it to add to gallery.");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setFileUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const response = await fetch("/api/product-images/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_slug: slug,
          image_url: imageUrl,
          sort_order: sortOrder,
          alt_text: altText,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to create image.");
      }

      setSaveMessage("Product image added successfully.");
      setImageUrl("");
      setSortOrder("");
      setAltText("");

      await loadImages();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id?: string) {
    if (!id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this image?"
    );

    if (!confirmed) return;

    try {
      setDeleteLoadingId(id);

      const response = await fetch("/api/product-images/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to delete image.");
      }

      await loadImages();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setDeleteLoadingId("");
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={pageHeaderStyle}>
        <div>
          <Link href={`/admin/products/${slug}`} style={backLinkStyle}>
            ← Back to Product
          </Link>
          <h1 style={titleStyle}>Product Images</h1>
          <p style={subtitleStyle}>
            Manage additional gallery images for this product.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.95fr 1.05fr",
          gap: 24,
        }}
      >
        <form onSubmit={handleSubmit} style={cardStyle}>
          <h2 style={sectionTitleStyle}>Add Image</h2>

          <div style={formGridStyle}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Upload from Computer</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
                style={inputStyle}
              />
              {fileUploading ? (
                <div style={helperTextStyle}>Uploading...</div>
              ) : null}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Image URL</label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Sort Order</label>
              <input
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="1"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Alt Text</label>
              <input
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Luxury towel detail"
                style={inputStyle}
              />
            </div>

            {imageUrl ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Preview</label>
                <div style={previewWrapStyle}>
                  <img
                    src={normalizeImageUrl(imageUrl)}
                    alt={altText || "Preview"}
                    style={previewImageStyle}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div style={buttonRowStyle}>
            <button type="submit" style={primaryButtonStyle} disabled={saving}>
              {saving ? "Saving..." : "Add Image"}
            </button>
          </div>

          {saveMessage ? <div style={successBoxStyle}>{saveMessage}</div> : null}
          {saveError ? <div style={errorBoxStyle}>{saveError}</div> : null}
        </form>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Existing Images</h2>

          {loading ? (
            <div>Loading...</div>
          ) : errorMessage ? (
            <div style={errorBoxStyle}>{errorMessage}</div>
          ) : items.length === 0 ? (
            <div style={emptyStateStyle}>No product images added yet.</div>
          ) : (
            <div style={listStyle}>
              {items.map((item, index) => (
                <div key={item.id || index} style={listCardStyle}>
                  <img
                    src={normalizeImageUrl(item.image_url || "")}
                    alt={item.alt_text || "Product image"}
                    style={imageStyle}
                  />
                  <div style={{ display: "grid", gap: 8 }}>
                    <div>
                      <strong>Sort:</strong> {item.sort_order || "-"}
                    </div>
                    <div>
                      <strong>Alt:</strong> {item.alt_text || "-"}
                    </div>
                    <div style={urlStyle}>{item.image_url || "-"}</div>

                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        style={dangerSmallButtonStyle}
                        disabled={deleteLoadingId === item.id}
                      >
                        {deleteLoadingId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 24,
  fontWeight: 800,
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 800,
  fontSize: 15,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 15,
};

const helperTextStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  color: "#7d7266",
};

const previewWrapStyle: React.CSSProperties = {
  border: "1px solid #e8dfd2",
  borderRadius: 18,
  padding: 12,
  background: "#fcfbf8",
};

const previewImageStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 260,
  aspectRatio: "1 / 1",
  objectFit: "cover",
  borderRadius: 14,
  display: "block",
  background: "#f5f5f5",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginTop: 24,
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const dangerSmallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #e5c9c9",
  background: "#fff5f5",
  color: "#8f2d2d",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
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

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const listCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "140px 1fr",
  gap: 16,
  border: "1px solid #e8dfd2",
  borderRadius: 18,
  padding: 14,
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  borderRadius: 12,
  background: "#f5f5f5",
};

const urlStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6f6559",
  wordBreak: "break-all",
};