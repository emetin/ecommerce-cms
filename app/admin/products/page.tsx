"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeImageUrl } from "../../../lib/image-url";

type ProductDashboardItem = {
  id?: string;
  title?: string;
  slug?: string;
  handle?: string;
  image?: string;
  image_url?: string;
  image_alt?: string;
  collection_id?: string;
  collection_slug?: string;
  status?: string;
  featured?: boolean | string;
  short_description?: string;
  updated_at?: string;
  created_at?: string;
  vendor?: string;
  product_category?: string;
  product_type?: string;
  tags?: string;
  base_price?: number | null;
  compare_at_price?: number | null;
  currency?: string;
  box_quantity?: number;
  min_order_quantity?: number;
  quantity_step?: number;
  is_wholesale_only?: boolean;
  allow_quote_request?: boolean;
  allow_online_checkout?: boolean;

  gallery_image_count?: number;
  gallery_main_image_exists?: boolean;
  gallery_alt_count?: number;
  gallery_primary_image?: string;
  gallery_issues?: string[];
  gallery_score?: number;
};

type DashboardSummary = {
  publishedCount: number;
  draftCount: number;
  archivedCount: number;
  missingGallery: number;
  missingMainImage: number;
  missingAltText: number;
  lowImageCount: number;
  missingPrice: number;
};

type ProductsApiResponse = {
  ok?: boolean;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  items?: ProductDashboardItem[];
  error?: string;
};

const PAGE_SIZE = 50;

const EMPTY_SUMMARY: DashboardSummary = {
  publishedCount: 0,
  draftCount: 0,
  archivedCount: 0,
  missingGallery: 0,
  missingMainImage: 0,
  missingAltText: 0,
  lowImageCount: 0,
  missingPrice: 0,
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isFeatured(value: unknown) {
  if (typeof value === "boolean") return value;
  return normalizeLower(value) === "true";
}

function getNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatMoney(value: unknown, currency = "USD") {
  const number = Number(value);

  if (!Number.isFinite(number)) return "-";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(value: unknown) {
  const text = normalizeText(value);

  if (!text) return "-";

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function getPrimaryImage(item: ProductDashboardItem) {
  return normalizeImageUrl(
    item.gallery_primary_image || item.image_url || item.image || ""
  );
}

function buildGalleryIssues(item: ProductDashboardItem) {
  const issues: string[] = [];

  const primaryImage = getPrimaryImage(item);
  const imageCount = getNumber(item.gallery_image_count);
  const altCount = getNumber(item.gallery_alt_count);

  const hasExplicitGalleryData =
    item.gallery_image_count !== undefined ||
    item.gallery_main_image_exists !== undefined ||
    item.gallery_alt_count !== undefined;

  if (hasExplicitGalleryData) {
    if (imageCount <= 0) issues.push("No gallery");
    if (!item.gallery_main_image_exists) issues.push("No main image");
    if (imageCount > 0 && altCount < imageCount) issues.push("Missing alt text");
    if (imageCount > 0 && imageCount < 3) issues.push("Low image count");
  } else {
    if (!primaryImage) issues.push("No image");
  }

  if (item.base_price === null || item.base_price === undefined) {
    issues.push("Missing price");
  }

  return issues;
}

function getGalleryScore(item: ProductDashboardItem) {
  if (typeof item.gallery_score === "number") {
    return item.gallery_score;
  }

  const issues = buildGalleryIssues(item);

  if (issues.length === 0) return 100;
  if (issues.length === 1) return 75;
  if (issues.length === 2) return 50;
  return 25;
}

function buildSummary(items: ProductDashboardItem[]): DashboardSummary {
  return items.reduce<DashboardSummary>((acc, item) => {
    const status = normalizeLower(item.status);
    const issues = buildGalleryIssues(item);

    if (status === "published") acc.publishedCount += 1;
    if (status === "draft") acc.draftCount += 1;
    if (status === "archived") acc.archivedCount += 1;

    if (issues.includes("No gallery") || issues.includes("No image")) {
      acc.missingGallery += 1;
    }

    if (issues.includes("No main image")) {
      acc.missingMainImage += 1;
    }

    if (issues.includes("Missing alt text")) {
      acc.missingAltText += 1;
    }

    if (issues.includes("Low image count")) {
      acc.lowImageCount += 1;
    }

    if (issues.includes("Missing price")) {
      acc.missingPrice += 1;
    }

    return acc;
  }, { ...EMPTY_SUMMARY });
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
      : normalized === "archived"
      ? {
          ...badgeStyle,
          background: "#f3f3f3",
          color: "#5e5e5e",
          border: "1px solid #dddddd",
        }
      : {
          ...badgeStyle,
          background: "#f3f3f3",
          color: "#5e5e5e",
          border: "1px solid #dddddd",
        };

  return <span style={style}>{value}</span>;
}

export default function AdminProductsPage() {
  const [items, setItems] = useState<ProductDashboardItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteLoadingSlug, setDeleteLoadingSlug] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitialLoadRef = useRef(false);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      if (search.trim()) {
        params.set("q", search.trim());
      }

      const response = await fetch(`/api/products/list?${params.toString()}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as ProductsApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load products.");
      }

      const apiItems = Array.isArray(data.items) ? data.items : [];

      setItems(apiItems);
      setSummary(buildSummary(apiItems));
      setTotal(Number(data.total || 0));
      setTotalPages(Number(data.totalPages || 1));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
      loadDashboard();
      return;
    }

    loadDashboard();
  }, [loadDashboard]);

  async function handleDelete(slug?: string) {
    if (!slug) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      setDeleteLoadingSlug(slug);

      const response = await fetch("/api/products/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to delete product.");
      }

      await loadDashboard();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setDeleteLoadingSlug("");
    }
  }

  const onThisPage = useMemo(() => items.length, [items]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Products</h1>
          <p style={subtitleStyle}>
            Manage Shopify-style wholesale products, variants, pricing, images,
            and catalog readiness from one admin screen.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <Link href="/admin/products/new" style={primaryButtonStyle}>
            + New Product
          </Link>

          <Link href="/admin/products/bulk" style={secondaryButtonStyle}>
            Open Bulk Editor
          </Link>

          <a href="/api/products/export?format=csv" style={secondaryButtonStyle}>
            Export CSV
          </a>

          <a href="/api/products/export?format=json" style={secondaryButtonStyle}>
            Export JSON
          </a>

          <a href="/api/products/export?format=xml" style={secondaryButtonStyle}>
            Export XML
          </a>
        </div>
      </div>

      <div style={filterCardStyle}>
        <div style={statsRowStyle}>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Total Results</div>
            <div style={statValueStyle}>{total}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>On This Page</div>
            <div style={statValueStyle}>{onThisPage}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Published</div>
            <div style={statValueStyle}>{summary.publishedCount}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Draft</div>
            <div style={statValueStyle}>{summary.draftCount}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Archived</div>
            <div style={statValueStyle}>{summary.archivedCount}</div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>No Image</div>
            <div style={warningStatValueStyle}>{summary.missingGallery}</div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>No Main Image</div>
            <div style={warningStatValueStyle}>{summary.missingMainImage}</div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>Missing Alt Text</div>
            <div style={warningStatValueStyle}>{summary.missingAltText}</div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>Missing Price</div>
            <div style={warningStatValueStyle}>{summary.missingPrice}</div>
          </div>
        </div>

        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Search</label>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by title, slug, vendor, type, category, tags"
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
      ) : items.length === 0 ? (
        <div style={emptyStateStyle}>
          No products matched your current search or filters.
        </div>
      ) : (
        <div style={tableCardStyle}>
          <div style={tableScrollStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Price</th>
                  <th style={thStyle}>Wholesale Rule</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Readiness</th>
                  <th style={thStyle}>Updated</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => {
                  const featured = isFeatured(item.featured);
                  const primaryImage = getPrimaryImage(item);
                  const issues = buildGalleryIssues(item);
                  const score = getGalleryScore(item);
                  const currency = item.currency || "USD";

                  const boxQuantity = getNumber(item.box_quantity) || 1;
                  const minOrderQuantity =
                    getNumber(item.min_order_quantity) || boxQuantity;
                  const quantityStep =
                    getNumber(item.quantity_step) || boxQuantity;

                  return (
                    <tr key={item.id || item.slug || index}>
                      <td style={tdStyle}>
                        <div style={productCellStyle}>
                          <div style={thumbWrapStyle}>
                            {primaryImage ? (
                              <img
                                src={primaryImage}
                                alt={item.image_alt || item.title || "Product"}
                                style={thumbStyle}
                              />
                            ) : (
                              <div style={thumbEmptyStyle}>No Image</div>
                            )}
                          </div>

                          <div style={{ display: "grid", gap: 6 }}>
                            <div style={productTitleRowStyle}>
                              <div style={{ fontWeight: 800 }}>
                                {item.title || "-"}
                              </div>

                              {featured ? (
                                <span style={featuredBadgeStyle}>Featured</span>
                              ) : null}

                              {item.is_wholesale_only ? (
                                <span style={wholesaleBadgeStyle}>Wholesale</span>
                              ) : null}
                            </div>

                            <div style={mutedTextStyle}>
                              {item.short_description ||
                                "No short description added yet."}
                            </div>

                            <div style={tinyMetaStyle}>
                              <span>Slug: {item.slug || "-"}</span>
                              <span>Vendor: {item.vendor || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <strong>{formatMoney(item.base_price, currency)}</strong>

                          {item.compare_at_price ? (
                            <span style={comparePriceStyle}>
                              Compare:{" "}
                              {formatMoney(item.compare_at_price, currency)}
                            </span>
                          ) : (
                            <span style={comparePriceStyle}>No compare price</span>
                          )}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={quantityRuleStyle}>
                          <div>
                            <strong>Box:</strong> {boxQuantity}
                          </div>
                          <div>
                            <strong>Min:</strong> {minOrderQuantity}
                          </div>
                          <div>
                            <strong>Step:</strong> {quantityStep}
                          </div>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <div>{item.product_type || "-"}</div>
                          <div style={mutedTextStyle}>
                            {item.product_category || "-"}
                          </div>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <StatusBadge value={item.status || "-"} />
                      </td>

                      <td style={tdStyle}>
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={galleryScoreWrapStyle}>
                            <div style={galleryScoreLabelStyle}>Readiness</div>
                            <div style={galleryScoreValueStyle}>{score}%</div>
                          </div>

                          {issues.length === 0 ? (
                            <span style={okBadgeStyle}>Looks good</span>
                          ) : (
                            <div style={warningListStyle}>
                              {issues.map((issue) => (
                                <span key={issue} style={warningBadgeStyle}>
                                  {issue}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      <td style={tdStyle}>{formatDate(item.updated_at)}</td>

                      <td style={tdStyle}>
                        <div style={actionColumnStyle}>
                          {item.slug ? (
                            <Link
                              href={`/admin/products/${item.slug}`}
                              style={secondarySmallButtonStyle}
                            >
                              Edit
                            </Link>
                          ) : null}

                          {item.slug ? (
                            <Link
                              href={`/admin/products/${item.slug}/images`}
                              style={primarySmallButtonStyle}
                            >
                              Images
                            </Link>
                          ) : null}

                          {item.slug ? (
                            <Link
                              href={`/products/${item.slug}`}
                              style={secondarySmallButtonStyle}
                            >
                              View
                            </Link>
                          ) : null}

                          {item.slug ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.slug)}
                              style={dangerSmallButtonStyle}
                              disabled={deleteLoadingSlug === item.slug}
                            >
                              {deleteLoadingSlug === item.slug
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={paginationWrapStyle}>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              style={secondarySmallButtonStyle}
            >
              Previous
            </button>

            <div style={paginationInfoStyle}>
              Page {page} / {totalPages}
            </div>

            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              style={secondarySmallButtonStyle}
            >
              Next
            </button>
          </div>
        </div>
      )}
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
  minWidth: 170,
  background: "#f8f5ef",
  border: "1px solid #e3dbcf",
  borderRadius: 18,
  padding: 16,
};

const warningStatBoxStyle: React.CSSProperties = {
  minWidth: 170,
  background: "#fff7e8",
  border: "1px solid #ecd8ad",
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

const warningStatValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  color: "#8a6418",
};

const filterGridStyle: React.CSSProperties = {
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

const productCellStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "82px 1fr",
  gap: 14,
  alignItems: "start",
  minWidth: 420,
};

const thumbWrapStyle: React.CSSProperties = {
  width: 82,
};

const thumbStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  borderRadius: 14,
  border: "1px solid #e5dccf",
  background: "#f5f5f5",
  display: "block",
};

const thumbEmptyStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
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
  padding: 8,
};

const productTitleRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

const featuredBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#eef8f0",
  color: "#1d6a43",
  border: "1px solid #cfe7d8",
  fontWeight: 800,
  fontSize: 12,
};

const wholesaleBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#f8f5ef",
  color: "#5f564b",
  border: "1px solid #e3dbcf",
  fontWeight: 800,
  fontSize: 12,
};

const mutedTextStyle: React.CSSProperties = {
  color: "#6f6559",
  fontSize: 13,
  lineHeight: 1.6,
};

const tinyMetaStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  color: "#8a8178",
  fontSize: 12,
  lineHeight: 1.5,
};

const comparePriceStyle: React.CSSProperties = {
  color: "#7a7067",
  fontSize: 13,
};

const quantityRuleStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#5f564b",
  fontSize: 13,
  lineHeight: 1.5,
};

const galleryScoreWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
};

const galleryScoreLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#7b7267",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontWeight: 700,
};

const galleryScoreValueStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  color: "#171717",
};

const okBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 999,
  background: "#edf8f1",
  color: "#1d6a43",
  border: "1px solid #cfe7d8",
  fontWeight: 800,
  fontSize: 12,
};

const warningListStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const warningBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 30,
  padding: "0 10px",
  borderRadius: 999,
  background: "#fff7e8",
  color: "#8a6418",
  border: "1px solid #ecd8ad",
  fontWeight: 800,
  fontSize: 12,
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

const actionColumnStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  minWidth: 210,
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

const primarySmallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 14,
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
  textDecoration: "none",
  fontSize: 14,
};

const paginationWrapStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: 18,
  borderTop: "1px solid #efe8dc",
  flexWrap: "wrap",
};

const paginationInfoStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#5f564b",
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