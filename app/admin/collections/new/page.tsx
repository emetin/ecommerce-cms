"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import ImportPanel from "../../../../components/admin/ImportPanel";

function makeSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewCollectionPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [status, setStatus] = useState("draft");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [resultError, setResultError] = useState("");

  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const suggestedSlug = useMemo(() => makeSlug(title), [title]);

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadError("");
    setImageUploading(true);

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select a valid image file.");
      }

      const maxSizeMb = 4;
      if (file.size > maxSizeMb * 1024 * 1024) {
        throw new Error(`Image must be smaller than ${maxSizeMb}MB.`);
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.ok || !data.url) {
        throw new Error(data?.error || "Image upload failed.");
      }

      setImage(data.url);
    } catch (error) {
      setImageUploadError(
        error instanceof Error ? error.message : "Image upload failed."
      );
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function clearImage() {
    setImage("");
    setImageUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setResultMessage("");
    setResultError("");

    try {
      const response = await fetch("/api/collections/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          slug,
          description,
          image,
          status,
          seo_title: seoTitle,
          seo_description: seoDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to create the collection.");
      }

      setResultMessage("Collection created successfully.");

      setTitle("");
      setSlug("");
      setDescription("");
      setImage("");
      setStatus("draft");
      setSeoTitle("");
      setSeoDescription("");
      setImageUploadError("");
    } catch (error) {
      setResultError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={pageHeaderStyle}>
        <div>
          <Link href="/admin/collections" style={backLinkStyle}>
            ← Back to Collections
          </Link>
          <h1 style={titleStyle}>New Collection</h1>
          <p style={subtitleStyle}>
            Create a single collection or upload a CSV/JSON file for bulk import.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <a
            href="/api/collections/export?format=csv"
            style={secondaryButtonStyle}
          >
            Export CSV
          </a>
          <a
            href="/api/collections/export?format=json"
            style={secondaryButtonStyle}
          >
            Export JSON
          </a>
          <a
            href="/api/collections/export?format=xml"
            style={secondaryButtonStyle}
          >
            Export XML
          </a>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        <form onSubmit={handleSubmit} style={cardStyle}>
          <div style={sectionTitleWrapStyle}>
            <h2 style={sectionTitleStyle}>Create Collection Manually</h2>
          </div>

          <div style={formGridStyle}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bath Towels"
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="bath-towels"
                style={inputStyle}
              />
              <div style={helperTextStyle}>
                Suggested slug: <strong>{suggestedSlug || "-"}</strong>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Collection Image</label>

              <div style={imageToolsWrapStyle}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={fileInputStyle}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={secondaryButtonStyle}
                  disabled={imageUploading}
                >
                  {imageUploading ? "Uploading..." : "Upload Image"}
                </button>

                {image ? (
                  <button
                    type="button"
                    onClick={clearImage}
                    style={dangerSmallButtonStyle}
                  >
                    Remove Image
                  </button>
                ) : null}
              </div>

              {imageUploadError ? (
                <div style={errorInlineStyle}>{imageUploadError}</div>
              ) : null}

              {image ? (
                <div style={imagePreviewCardStyle}>
                  <img
                    src={image}
                    alt={title || "Collection image"}
                    style={imagePreviewStyle}
                  />
                </div>
              ) : (
                <div style={emptyImageBoxStyle}>No image selected.</div>
              )}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Image URL / Stored Value</label>
              <textarea
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="Paste image URL here or use Upload Image"
                style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Collection description"
                style={{ ...inputStyle, minHeight: 220, resize: "vertical" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>SEO Title</label>
              <input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="SEO title"
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>SEO Description</label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="SEO description"
                style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
              />
            </div>
          </div>

          <div style={buttonRowStyle}>
            <button type="submit" style={primaryButtonStyle} disabled={loading}>
              {loading ? "Saving..." : "Create Collection"}
            </button>

            <Link href="/admin/collections" style={secondaryButtonStyle}>
              Back to Collections
            </Link>
          </div>

          {resultMessage ? <div style={successBoxStyle}>{resultMessage}</div> : null}
          {resultError ? <div style={errorBoxStyle}>{resultError}</div> : null}
        </form>

        <ImportPanel
          endpoint="/api/collections/import"
          description="Upload a CSV or JSON file, or paste content manually. This panel is suitable for collection data adapted to the Patak structure."
          csvHeader="id,title,slug,description,image,status,created_at,updated_at,seo_title,seo_description"
        />
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

const titleStyle: React.CSSProperties = {
  fontSize: 42,
  lineHeight: 1.1,
  margin: "10px 0 10px",
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#6f6559",
  fontSize: 16,
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  color: "#5e5448",
  fontWeight: 700,
  marginBottom: 4,
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const sectionTitleWrapStyle: React.CSSProperties = {
  marginBottom: 18,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
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

const helperTextStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  color: "#7d7266",
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

const imageToolsWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 14,
};

const fileInputStyle: React.CSSProperties = {
  display: "none",
};

const imagePreviewCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 320,
  borderRadius: 20,
  overflow: "hidden",
  border: "1px solid #e5ddd2",
  background: "#faf8f4",
  marginTop: 6,
};

const imagePreviewStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  display: "block",
};

const emptyImageBoxStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 320,
  minHeight: 180,
  borderRadius: 20,
  border: "1px dashed #d9cfbf",
  background: "#faf8f4",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#7b7367",
  fontWeight: 700,
  marginTop: 6,
  padding: 16,
  textAlign: "center",
};

const errorInlineStyle: React.CSSProperties = {
  marginBottom: 12,
  padding: 12,
  borderRadius: 12,
  background: "#fff1f1",
  border: "1px solid #efc9c9",
  color: "#7a2222",
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
  textDecoration: "none",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};

const dangerSmallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #e5c9c9",
  background: "#fff5f5",
  color: "#8f2d2d",
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