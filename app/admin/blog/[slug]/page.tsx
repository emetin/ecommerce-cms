"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type BlogItem = {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  image?: string;
  image_file_id?: string;
  image_alt?: string;
  image_uploaded_at?: string;
  status?: string;
  featured?: string;
  created_at?: string;
  updated_at?: string;
};

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

export default function AdminBlogEditPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const originalSlug = decodeURIComponent(params.slug).trim().toLowerCase();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [imageFileId, setImageFileId] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageUploadedAt, setImageUploadedAt] = useState("");
  const [status, setStatus] = useState("draft");
  const [featured, setFeatured] = useState("false");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [resultError, setResultError] = useState("");

  const suggestedSlug = useMemo(() => makeSlug(title), [title]);

  useEffect(() => {
    async function loadItem() {
      try {
        setLoading(true);
        setLoadError("");

        const response = await fetch("/api/blog/list", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data?.error || "Failed to load blog posts.");
        }

        const item = (data.items as BlogItem[]).find(
          (post) => String(post.slug || "").trim().toLowerCase() === originalSlug
        );

        if (!item) {
          throw new Error("Blog post was not found.");
        }

        setTitle(item.title || "");
        setSlug(item.slug || "");
        setExcerpt(item.excerpt || "");
        setContent(item.content || "");
        setImage(item.image || "");
        setImageFileId(item.image_file_id || "");
        setImageAlt(item.image_alt || "");
        setImageUploadedAt(item.image_uploaded_at || "");
        setStatus(String(item.status || "draft").toLowerCase());
        setFeatured(String(item.featured || "false").toLowerCase());
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "An unknown error occurred."
        );
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [originalSlug]);

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
      formData.append("entityType", "blog");
      formData.append("alt", title || file.name || "Blog image");
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setResultMessage("");
      setResultError("");

      const response = await fetch("/api/blog/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalSlug,
          title,
          slug,
          excerpt,
          content,
          image,
          image_file_id: imageFileId,
          image_alt: imageAlt,
          image_uploaded_at: imageUploadedAt,
          status,
          featured,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to update the blog post.");
      }

      const updatedSlug = String(data?.item?.slug || slug || originalSlug).trim();

      setResultMessage("Blog post updated successfully.");

      if (updatedSlug && updatedSlug.toLowerCase() !== originalSlug) {
        router.replace(`/admin/blog/${updatedSlug}`);
      }
    } catch (error) {
      setResultError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this blog post?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setResultMessage("");
      setResultError("");

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

      const response = await fetch("/api/blog/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: originalSlug,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to delete the blog post.");
      }

      router.push("/admin/blog");
      router.refresh();
    } catch (error) {
      setResultError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="simple-page">
        <div className="container">
          <div className="data-box">Loading...</div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="simple-page">
        <div className="container">
          <Link
            href="/admin/blog"
            className="btn-secondary"
            style={{ marginBottom: 20 }}
          >
            ← Blog Admin
          </Link>
          <div className="data-box">
            <h3>Error</h3>
            <pre>{loadError}</pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="simple-page">
      <div className="container" style={{ maxWidth: 900 }}>
        <Link
          href="/admin/blog"
          className="btn-secondary"
          style={{ marginBottom: 20 }}
        >
          ← Blog Admin
        </Link>

        <h1>Edit Blog Post</h1>
        <p className="lead">
          Update the blog post record or remove it from the system.
        </p>

        <form onSubmit={handleSubmit} className="data-box">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
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
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                style={inputStyle}
              />
              <div style={{ marginTop: 6, color: "#6d655b", fontSize: 14 }}>
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

            <div>
              <label style={labelStyle}>Featured</label>
              <select
                value={featured}
                onChange={(e) => setFeatured(e.target.value)}
                style={inputStyle}
              >
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Blog Image</label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                >
                  {imageUploading ? "Uploading..." : "Replace Image"}
                </button>

                {image ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={clearImage}
                  >
                    Remove Image
                  </button>
                ) : null}
              </div>

              {imageUploadError ? (
                <div style={errorBoxStyle}>{imageUploadError}</div>
              ) : null}

              {image ? (
                <img
                  src={image}
                  alt={imageAlt || title || "Blog image"}
                  style={{
                    width: "100%",
                    maxWidth: 280,
                    borderRadius: 14,
                    display: "block",
                    marginBottom: 12,
                  }}
                />
              ) : null}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Image URL</label>
              <input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Image File ID</label>
              <input
                value={imageFileId}
                onChange={(e) => setImageFileId(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Image Alt</label>
              <input
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Image Uploaded At</label>
              <input
                value={imageUploadedAt}
                onChange={(e) => setImageUploadedAt(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Excerpt</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ ...inputStyle, minHeight: 220, resize: "vertical" }}
              />
            </div>
          </div>

          <div
            style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}
          >
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Blog Post"}
            </button>
          </div>

          {resultMessage ? <div style={successBoxStyle}>{resultMessage}</div> : null}
          {resultError ? <div style={errorBoxStyle}>{resultError}</div> : null}
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #ddd3c5",
  background: "#fff",
  outline: "none",
};

const successBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 14,
  background: "#eef8f0",
  border: "1px solid #cfe5d4",
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 14,
  background: "#fff1f1",
  border: "1px solid #efc9c9",
  color: "#7a2222",
};