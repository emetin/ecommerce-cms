"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type CollectionItem = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  image?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  seo_title?: string;
  seo_description?: string;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=80";

function getSafeImageSrc(value?: string) {
  const src = String(value || "").trim();
  return src || FALLBACK_IMAGE;
}

export default function AdminCollectionsPage() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const didLoadRef = useRef(false);

  useEffect(() => {
    if (didLoadRef.current) {
      return;
    }

    didLoadRef.current = true;

    async function loadCollections() {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch("/api/collections/list", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data?.error || "Failed to load collections.");
        }

        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "An unknown error occurred."
        );
      } finally {
        setLoading(false);
      }
    }

    loadCollections();
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const title = String(item.title || "").toLowerCase();
      const slug = String(item.slug || "").toLowerCase();
      const description = String(item.description || "").toLowerCase();
      const status = String(item.status || "").toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        slug.includes(normalizedSearch) ||
        description.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || status === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Collections</h1>
          <p style={subtitleStyle}>
            Review and manage collection records used across the Patak content
            structure.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <Link href="/admin/collections/new" style={primaryButtonStyle}>
            + New Collection
          </Link>

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

      <div style={filterCardStyle}>
        <div style={statsRowStyle}>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Total Records</div>
            <div style={statValueStyle}>{items.length}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Filtered Results</div>
            <div style={statValueStyle}>{filteredItems.length}</div>
          </div>
        </div>

        <div style={filterGridStyleCollections}>
          <div>
            <label style={labelStyle}>Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, slug, or description"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={inputStyle}
            >
              <option value="all">all</option>
              <option value="published">published</option>
              <option value="draft">draft</option>
              <option value="archived">archived</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={cardStyle}>Loading...</div>
      ) : errorMessage ? (
        <div style={errorBoxStyle}>
          <strong>Error:</strong>
          <div style={{ marginTop: 8 }}>{errorMessage}</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={emptyStateStyle}>
          No collections matched your current search or filters.
        </div>
      ) : (
        <div style={tableCardStyle}>
          <div style={tableScrollStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Slug</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Updated</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={item.id || item.slug || index}>
                    <td style={tdStyle}>
                      <div style={titleCellWrapStyle}>
                        <div style={thumbBoxStyle}>
                          <img
                            src={getSafeImageSrc(item.image)}
                            alt={item.title || "Collection"}
                            style={thumbImageStyle}
                          />
                        </div>

                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontWeight: 800 }}>
                            {item.title || "-"}
                          </div>

                          <div
                            style={{
                              color: "#6f6559",
                              fontSize: 13,
                              lineHeight: 1.6,
                            }}
                          >
                            {item.description || "No description added yet."}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={tdStyle}>{item.slug || "-"}</td>

                    <td style={tdStyle}>
                      <StatusBadge value={item.status || "-"} />
                    </td>

                    <td style={tdStyle}>{item.updated_at || "-"}</td>

                    <td style={tdStyle}>
                      <div style={actionRowStyle}>
                        {item.slug ? (
                          <Link
                            href={`/admin/collections/${item.slug}`}
                            style={secondarySmallButtonStyle}
                          >
                            Edit
                          </Link>
                        ) : null}

                        {item.slug ? (
                          <Link
                            href={`/admin/collections/${item.slug}/products`}
                            style={secondarySmallButtonStyle}
                          >
                            Products
                          </Link>
                        ) : null}

                        {item.slug ? (
                          <Link
                            href={`/collections/${item.slug}`}
                            style={secondarySmallButtonStyle}
                          >
                            View
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();

  const style: React.CSSProperties =
    normalized === "published"
      ? {
          ...badgeStyle,
          background: "#edf8f1",
          color: "#1d6a43",
          border: "1px solid #cfe7d8",
        }
      : normalized === "draft"
      ? {
          ...badgeStyle,
          background: "#fff7e8",
          color: "#8a6418",
          border: "1px solid #ecd8ad",
        }
      : {
          ...badgeStyle,
          background: "#f3f3f3",
          color: "#5e5e5e",
          border: "1px solid #dddddd",
        };

  return <span style={style}>{value}</span>;
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
  margin: 0,
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 10,
  marginBottom: 0,
  color: "#6f6559",
  fontSize: 16,
  maxWidth: 760,
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
};

const filterCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const statsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  marginBottom: 20,
};

const statBoxStyle: React.CSSProperties = {
  minWidth: 180,
  background: "#f8f5ef",
  border: "1px solid #e3dbcf",
  borderRadius: 18,
  padding: 16,
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7c7267",
  marginBottom: 8,
  fontWeight: 700,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
};

const filterGridStyleCollections: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
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

const tableCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  overflow: "hidden",
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const tableScrollStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "18px 18px",
  fontSize: 13,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#7d7266",
  background: "#f8f5ef",
  borderBottom: "1px solid #e5dccf",
};

const tdStyle: React.CSSProperties = {
  padding: "18px 18px",
  borderBottom: "1px solid #efe8dc",
  verticalAlign: "top",
  fontSize: 15,
};

const titleCellWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
};

const thumbBoxStyle: React.CSSProperties = {
  width: 72,
  minWidth: 72,
  height: 72,
  borderRadius: 14,
  overflow: "hidden",
  border: "1px solid #e5dccf",
  background: "#f8f5ef",
};

const thumbImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 13,
};

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
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

const secondarySmallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 14,
};

const emptyStateStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 28,
  color: "#6f6559",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #efc9c9",
  color: "#7a2222",
};