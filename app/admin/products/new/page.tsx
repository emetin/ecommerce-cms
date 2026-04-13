"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

function makeSlug(text: string) {
  return String(text || "")
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

export default function AdminNewProductPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [image, setImage] = useState("");
  const [gallery, setGallery] = useState("");
  const [collectionSlug, setCollectionSlug] = useState("");
  const [statusValue, setStatusValue] = useState("draft");
  const [featured, setFeatured] = useState("false");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [typeValue, setTypeValue] = useState("");
  const [tags, setTags] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const suggestedSlug = useMemo(() => {
    return makeSlug(slug || title);
  }, [slug, title]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const response = await fetch("/api/products/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          slug,
          description,
          short_description: shortDescription,
          image,
          gallery,
          collection_slug: collectionSlug,
          status: statusValue,
          featured,
          seo_title: seoTitle,
          seo_description: seoDescription,
          vendor,
          product_category: productCategory,
          type: typeValue,
          tags,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to create product.");
      }

      setSaveMessage("Product created successfully.");

      setTitle("");
      setSlug("");
      setDescription("");
      setShortDescription("");
      setImage("");
      setGallery("");
      setCollectionSlug("");
      setStatusValue("draft");
      setFeatured("false");
      setSeoTitle("");
      setSeoDescription("");
      setVendor("");
      setProductCategory("");
      setTypeValue("");
      setTags("");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={pageHeaderStyle}>
        <div>
          <Link href="/admin/products" style={backLinkStyle}>
            ← Back to Products
          </Link>
          <h1 style={titleStyle}>Create New Product</h1>
          <p style={subtitleStyle}>
            Add a new product to the products sheet. Gallery images can be managed
            later from the Image Manager after the product is created.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={cardStyle}>
        <div style={sectionTitleWrapStyle}>
          <h2 style={sectionTitleStyle}>Product Information</h2>
          <p style={sectionTextStyle}>
            Fill out the main product details below. Keep the primary image simple
            here, then organize the rest of the gallery after creation.
          </p>
        </div>

        <div style={formGridStyle}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Luxury Bath Towel"
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Custom Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="luxury-bath-towel"
              style={inputStyle}
            />
            <div style={helperTextStyle}>
              Leave blank to auto-generate from the title.
            </div>
          </div>

          <div>
            <label style={labelStyle}>Final Slug Preview</label>
            <input value={suggestedSlug} style={inputStyle} disabled />
          </div>

          <div>
            <label style={labelStyle}>Collection Slug</label>
            <input
              value={collectionSlug}
              onChange={(e) => setCollectionSlug(e.target.value)}
              placeholder="towels"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
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

          <div>
            <label style={labelStyle}>Vendor</label>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Patak Textile"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Product Category</label>
            <input
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              placeholder="Bath"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Type</label>
            <input
              value={typeValue}
              onChange={(e) => setTypeValue(e.target.value)}
              placeholder="Towel"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="hotel, luxury, bath"
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Primary Image URL</label>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/product-image.jpg"
              style={inputStyle}
            />
            <div style={helperTextStyle}>
              This is the legacy main image field saved directly in the product row.
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Legacy Gallery Field</label>
            <textarea
              value={gallery}
              onChange={(e) => setGallery(e.target.value)}
              placeholder="Comma-separated image URLs"
              style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
            />
            <div style={helperTextStyle}>
              This is optional. Gallery images can be managed later from the
              dedicated Image Manager.
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Short Description</label>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Short summary"
              style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full product description"
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
              style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
            />
          </div>
        </div>

        <div style={buttonRowStyle}>
          <button type="submit" style={primaryButtonStyle} disabled={saving}>
            {saving ? "Saving..." : "Create Product"}
          </button>

          <Link href="/admin/products" style={secondaryButtonStyle}>
            Cancel
          </Link>
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
  maxWidth: 760,
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  color: "#5e5448",
  fontWeight: 700,
  marginBottom: 4,
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

const sectionTextStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#6f6559",
  fontSize: 15,
  lineHeight: 1.7,
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
  lineHeight: 1.6,
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

const successBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 16,
  background: "#eef8f0",
  border: "1px solid #cfe5d4",
  color: "#245843",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 700,
};