"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";

type CollectionItem = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  image?: string;
  image_file_id?: string;
  image_alt?: string;
  image_uploaded_at?: string;
  status?: string;
  seo_title?: string;
  seo_description?: string;
  created_at?: string;
  updated_at?: string;
};

function normalizeText(value?: string) {
  return String(value || "").trim();
}

export default function AdminCollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = use(params);
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();

  const [item, setItem] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [imageFileId, setImageFileId] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageUploadedAt, setImageUploadedAt] = useState("");
  const [status, setStatus] = useState("draft");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedSlugRef = useRef("");

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await fetch(
        `/api/collections/get?slug=${encodeURIComponent(slug)}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load collection.");
      }

      const found = data.item || null;

      if (!found) {
        throw new Error("Collection not found.");
      }

      setItem(found);
      setTitle(found.title || "");
      setDescription(found.description || "");
      setImage(found.image || "");
      setImageFileId(found.image_file_id || "");
      setImageAlt(found.image_alt || "");
      setImageUploadedAt(found.image_uploaded_at || "");
      setStatus(found.status || "draft");
      setSeoTitle(found.seo_title || "");
      setSeoDescription(found.seo_description || "");
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    if (loadedSlugRef.current === slug) return;

    loadedSlugRef.current = slug;
    loadPage();
  }, [slug, loadPage]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const response = await fetch("/api/collections/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          title: normalizeText(title),
          description: normalizeText(description),
          image: normalizeText(image),
          image_file_id: normalizeText(imageFileId),
          image_alt: normalizeText(imageAlt),
          image_uploaded_at: normalizeText(imageUploadedAt),
          status: normalizeText(status).toLowerCase(),
          seo_title: normalizeText(seoTitle),
          seo_description: normalizeText(seoDescription),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to update collection.");
      }

      setSaveMessage("Collection updated successfully.");
      await loadPage();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this collection?"
    );

    if (!confirmed) return;

    try {
      setDeleteLoading(true);

      if (imageFileId) {
        await fetch("/api/media/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file_id: imageFileId,
          }),
        });
      }

      const response = await fetch("/api/collections/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to delete collection.");
      }

      window.location.href = "/admin/collections";
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadError("");
    setImageUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", "collection");
      formData.append("alt", title || file.name || "Collection image");
      formData.append("oldFileId", imageFileId || "");

      const response = await fetch("/api/media/replace", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.ok || !data.url) {
        throw new Error(data?.error || "Image upload failed.");
      }

      setImage(data.url || "");
      setImageFileId(data.file_id || "");
      setImageAlt(data.alt || "");
      setImageUploadedAt(data.uploaded_at || "");
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

  async function clearImage() {
    try {
      if (imageFileId) {
        await fetch("/api/media/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file_id: imageFileId,
          }),
        });
      }
    } catch (error) {
      console.error("Failed to delete image from Drive:", error);
    }

    setImage("");
    setImageFileId("");
    setImageAlt("");
    setImageUploadedAt("");
    setImageUploadError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return <div style={cardStyle}>Loading...</div>;
  }

  if (pageError || !item) {
    return (
      <div style={errorBoxStyle}>
        <strong>Error:</strong>
        <div style={{ marginTop: 8 }}>{pageError || "Collection not found."}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={pageHeaderStyle}>
        <div>
          <Link href="/admin/collections" style={backLinkStyle}>
            ← Back to Collections
          </Link>
          <h1 style={titleStyle}>{item.title || "Collection"}</h1>
          <p style={subtitleStyle}>
            Edit collection details and manage its structure.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <Link
            href={`/admin/collections/${slug}/products`}
            style={secondaryButtonStyle}
          >
            Products
          </Link>
          <Link href={`/collections/${slug}`} style={secondaryButtonStyle}>
            View
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            style={dangerButtonStyle}
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} style={cardStyle}>
        <div style={formGridStyle}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Slug</label>
            <input value={slug} style={inputStyle} disabled />
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
                {imageUploading ? "Uploading..." : "Replace Image"}
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
                  alt={imageAlt || title || "Collection image"}
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
              style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
              placeholder="Paste image URL here or use Replace Image"
            />
          </div>

          <div>
            <label style={labelStyle}>Image File ID</label>
            <input
              value={imageFileId}
              onChange={(e) => setImageFileId(e.target.value)}
              style={inputStyle}
              placeholder="Google Drive file id"
            />
          </div>

          <div>
            <label style={labelStyle}>Image Alt</label>
            <input
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              style={inputStyle}
              placeholder="Collection image alt"
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Image Uploaded At</label>
            <input
              value={imageUploadedAt}
              onChange={(e) => setImageUploadedAt(e.target.value)}
              style={inputStyle}
              placeholder="ISO date"
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 180, resize: "vertical" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>SEO Title</label>
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>SEO Description</label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
            />
          </div>
        </div>

        <div style={buttonRowStyle}>
          <button type="submit" style={primaryButtonStyle} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {saveMessage ? <div style={successBoxStyle}>{saveMessage}</div> : null}
        {saveError ? <div style={errorBoxStyle}>{saveError}</div> : null}
      </form>
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
  fontSize: 40,
  lineHeight: 1.1,
  margin: "10px 0 10px",
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#6f6559",
  fontSize: 16,
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
  textDecoration: "none",
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #e5c9c9",
  background: "#fff5f5",
  color: "#8f2d2d",
  fontWeight: 800,
  cursor: "pointer",
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