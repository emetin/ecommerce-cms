"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CollectionProductItem = {
  id?: string;
  collection_slug?: string;
  product_slug?: string;
  sort_order?: string;
  featured?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export default function AdminCollectionProductsClient({
  slug,
}: {
  slug: string;
}) {
  const decodedSlug = decodeURIComponent(slug);

  const [items, setItems] = useState<CollectionProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [productSlug, setProductSlug] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [featured, setFeatured] = useState("false");
  const [status, setStatus] = useState("published");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [deleteLoadingId, setDeleteLoadingId] = useState("");

  async function loadLinks() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(
        `/api/collection-products/list?collection_slug=${encodeURIComponent(
          decodedSlug
        )}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load collection products.");
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
    loadLinks();
  }, [decodedSlug]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const response = await fetch("/api/collection-products/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collection_slug: decodedSlug,
          product_slug: productSlug,
          sort_order: sortOrder,
          featured,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to link product.");
      }

      setSaveMessage("Product linked to collection successfully.");
      setProductSlug("");
      setSortOrder("");
      setFeatured("false");
      setStatus("published");

      await loadLinks();
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
      "Are you sure you want to remove this product from the collection?"
    );

    if (!confirmed) return;

    try {
      setDeleteLoadingId(id);

      const response = await fetch("/api/collection-products/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to delete link.");
      }

      await loadLinks();
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
          <Link href={`/admin/collections/${decodedSlug}`} style={backLinkStyle}>
            ← Back to Collection
          </Link>
          <h1 style={titleStyle}>Collection Products</h1>
          <p style={subtitleStyle}>
            Manage product assignments for this collection.
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
          <h2 style={sectionTitleStyle}>Add Product Link</h2>

          <div style={formGridStyle}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Product Slug</label>
              <input
                value={productSlug}
                onChange={(e) => setProductSlug(e.target.value)}
                placeholder="luxury-hotel-towel-set"
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
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="published">published</option>
                <option value="draft">draft</option>
                <option value="archived">archived</option>
              </select>
            </div>
          </div>

          <div style={buttonRowStyle}>
            <button type="submit" style={primaryButtonStyle} disabled={saving}>
              {saving ? "Saving..." : "Add Product"}
            </button>
          </div>

          {saveMessage ? <div style={successBoxStyle}>{saveMessage}</div> : null}
          {saveError ? <div style={errorBoxStyle}>{saveError}</div> : null}
        </form>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Existing Links</h2>

          {loading ? (
            <div>Loading...</div>
          ) : errorMessage ? (
            <div style={errorBoxStyle}>{errorMessage}</div>
          ) : items.length === 0 ? (
            <div style={emptyStateStyle}>No collection product links yet.</div>
          ) : (
            <div style={listStyle}>
              {items.map((item, index) => (
                <div key={item.id || index} style={listCardStyle}>
                  <div>
                    <strong>Product:</strong> {item.product_slug || "-"}
                  </div>
                  <div>
                    <strong>Sort:</strong> {item.sort_order || "-"}
                  </div>
                  <div>
                    <strong>Featured:</strong> {item.featured || "-"}
                  </div>
                  <div>
                    <strong>Status:</strong> {item.status || "-"}
                  </div>

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
  gap: 8,
  border: "1px solid #e8dfd2",
  borderRadius: 18,
  padding: 14,
};