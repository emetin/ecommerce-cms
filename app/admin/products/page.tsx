"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeImageUrl } from "../../../lib/image-url";

type ProductItem = {
  id?: string;
  title?: string;
  slug?: string;
  image?: string;
  collection_slug?: string;
  status?: string;
  featured?: string;
  short_description?: string;
  updated_at?: string;
};

type ProductImageItem = {
  id?: string;
  product_slug?: string;
  image_url?: string;
  sort_order?: string;
  alt_text?: string;
  is_main?: string;
  created_at?: string;
  updated_at?: string;
};

type BulkResponse = {
  ok: boolean;
  summary?: {
    total: number;
    successCount: number;
    failedCount: number;
  };
  results?: Array<{
    slug: string;
    ok: boolean;
    error?: string;
  }>;
  error?: string;
};

const PAGE_SIZE = 50;

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isTrue(value: unknown) {
  return normalizeLower(value) === "true";
}

function toSafeOrder(value: unknown) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : 999999;
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

function buildImageMap(allImages: ProductImageItem[]) {
  const map = new Map<string, ProductImageItem[]>();

  for (const item of allImages) {
    const slug = normalizeLower(item.product_slug);
    if (!slug) continue;

    if (!map.has(slug)) {
      map.set(slug, []);
    }

    map.get(slug)!.push(item);
  }

  for (const [slug, images] of map.entries()) {
    map.set(slug, sortImages(images));
  }

  return map;
}

function getGalleryState(
  product: ProductItem,
  imageMap: Map<string, ProductImageItem[]>
) {
  const slug = normalizeLower(product.slug);
  const images = imageMap.get(slug) || [];

  const mainImage = images.find((item) => isTrue(item.is_main)) || null;
  const firstImage = images[0] || null;
  const altCount = images.filter((item) => normalizeText(item.alt_text)).length;

  const primaryImage = normalizeImageUrl(
    mainImage?.image_url || firstImage?.image_url || product.image || ""
  );

  const issues: string[] = [];

  if (images.length === 0) {
    issues.push("No gallery images");
  }

  if (images.length > 0 && !mainImage) {
    issues.push("No main image");
  }

  if (images.length > 0 && altCount < images.length) {
    issues.push("Missing alt text");
  }

  if (images.length > 0 && images.length < 3) {
    issues.push("Low image count");
  }

  let score = 0;
  if (images.length > 0) score += 35;
  if (mainImage) score += 35;
  if (images.length >= 3) score += 15;
  if (images.length > 0 && altCount === images.length) score += 15;

  return {
    images,
    imageCount: images.length,
    mainImageExists: Boolean(mainImage),
    altCount,
    primaryImage,
    issues,
    score,
  };
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

export default function AdminProductsPage() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [allImages, setAllImages] = useState<ProductImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteLoadingSlug, setDeleteLoadingSlug] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkFeatured, setBulkFeatured] = useState("");
  const [bulkCollectionSlug, setBulkCollectionSlug] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkError, setBulkError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const loadProducts = useCallback(async () => {
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

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data?.error || "Failed to load products.");
    }

    return data;
  }, [page, search, statusFilter]);

  const loadAllImages = useCallback(async () => {
    const response = await fetch("/api/product-images/list", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data?.error || "Failed to load product images.");
    }

    return Array.isArray(data.items) ? data.items : [];
  }, []);

  const loadProductsOnly = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const productData = await loadProducts();

      setItems(Array.isArray(productData.items) ? productData.items : []);
      setTotal(Number(productData.total || 0));
      setTotalPages(Number(productData.totalPages || 1));
      setSelectedSlugs([]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, [loadProducts]);

  const loadImagesOnly = useCallback(async () => {
    try {
      setImagesLoading(true);

      const imageItems = await loadAllImages();
      setAllImages(imageItems);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setImagesLoading(false);
    }
  }, [loadAllImages]);

  useEffect(() => {
    loadProductsOnly();
  }, [loadProductsOnly]);

  useEffect(() => {
    loadImagesOnly();
  }, [loadImagesOnly]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

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

      await Promise.all([loadProductsOnly(), loadImagesOnly()]);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setDeleteLoadingSlug("");
    }
  }

  async function handleBulkUpdate() {
    try {
      setBulkLoading(true);
      setBulkError("");
      setBulkMessage("");

      if (selectedSlugs.length === 0) {
        throw new Error("Please select at least one product.");
      }

      const changes: Record<string, string> = {};

      if (bulkStatus) {
        changes.status = bulkStatus;
      }

      if (bulkFeatured) {
        changes.featured = bulkFeatured;
      }

      if (bulkCollectionSlug.trim()) {
        changes.collection_slug = bulkCollectionSlug.trim();
      }

      if (Object.keys(changes).length === 0) {
        throw new Error("Please choose at least one field to update.");
      }

      const response = await fetch("/api/admin/products/bulk", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: selectedSlugs.map((slug) => ({
            slug,
            changes,
          })),
        }),
      });

      const data = (await response.json()) as BulkResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Bulk update failed.");
      }

      setBulkMessage(
        `Updated ${data.summary?.successCount || 0} of ${data.summary?.total || 0} selected product(s).`
      );

      setBulkStatus("");
      setBulkFeatured("");
      setBulkCollectionSlug("");

      await Promise.all([loadProductsOnly(), loadImagesOnly()]);
    } catch (error) {
      setBulkError(
        error instanceof Error ? error.message : "Bulk update failed."
      );
    } finally {
      setBulkLoading(false);
    }
  }

  function toggleSelectOne(slug?: string) {
    if (!slug) return;

    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((item) => item !== slug);
      }

      return [...prev, slug];
    });
  }

  function toggleSelectAllCurrentPage() {
    const currentPageSlugs = items
      .map((item) => normalizeText(item.slug))
      .filter(Boolean);

    const allSelected =
      currentPageSlugs.length > 0 &&
      currentPageSlugs.every((slug) => selectedSlugs.includes(slug));

    if (allSelected) {
      setSelectedSlugs((prev) =>
        prev.filter((slug) => !currentPageSlugs.includes(slug))
      );
      return;
    }

    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      currentPageSlugs.forEach((slug) => next.add(slug));
      return Array.from(next);
    });
  }

  const imageMap = useMemo(() => buildImageMap(allImages), [allImages]);

  const publishedCount = useMemo(
    () =>
      items.filter(
        (item) => String(item.status || "").toLowerCase() === "published"
      ).length,
    [items]
  );

  const draftCount = useMemo(
    () =>
      items.filter(
        (item) => String(item.status || "").toLowerCase() === "draft"
      ).length,
    [items]
  );

  const allCurrentPageSelected = useMemo(() => {
    const currentPageSlugs = items
      .map((item) => normalizeText(item.slug))
      .filter(Boolean);

    return (
      currentPageSlugs.length > 0 &&
      currentPageSlugs.every((slug) => selectedSlugs.includes(slug))
    );
  }, [items, selectedSlugs]);

  const hasBulkChanges = useMemo(() => {
    return Boolean(
      bulkStatus || bulkFeatured || bulkCollectionSlug.trim().length > 0
    );
  }, [bulkStatus, bulkFeatured, bulkCollectionSlug]);

  const canApplyBulkUpdate = selectedSlugs.length > 0 && hasBulkChanges && !bulkLoading;

  const bulkHint = useMemo(() => {
    if (selectedSlugs.length === 0) {
      return "Select at least one product to enable bulk update.";
    }

    if (!hasBulkChanges) {
      return "Choose at least one bulk field before applying update.";
    }

    return "";
  }, [selectedSlugs.length, hasBulkChanges]);

  const galleryAudit = useMemo(() => {
    let missingGallery = 0;
    let missingMainImage = 0;
    let missingAltText = 0;
    let lowImageCount = 0;

    items.forEach((item) => {
      const state = getGalleryState(item, imageMap);

      if (state.imageCount === 0) {
        missingGallery += 1;
      }
      if (state.imageCount > 0 && !state.mainImageExists) {
        missingMainImage += 1;
      }
      if (state.imageCount > 0 && state.altCount < state.imageCount) {
        missingAltText += 1;
      }
      if (state.imageCount > 0 && state.imageCount < 3) {
        lowImageCount += 1;
      }
    });

    return {
      missingGallery,
      missingMainImage,
      missingAltText,
      lowImageCount,
    };
  }, [items, imageMap]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Products</h1>
          <p style={subtitleStyle}>
            Review products, monitor gallery quality, and jump directly into the
            Image Manager when a product needs media fixes.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <Link href="/admin/products/new" style={primaryButtonStyle}>
            + New Product
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
            <div style={statValueStyle}>{items.length}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Published</div>
            <div style={statValueStyle}>{publishedCount}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Draft</div>
            <div style={statValueStyle}>{draftCount}</div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>No Gallery</div>
            <div style={warningStatValueStyle}>{galleryAudit.missingGallery}</div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>No Main Image</div>
            <div style={warningStatValueStyle}>
              {galleryAudit.missingMainImage}
            </div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>Missing Alt Text</div>
            <div style={warningStatValueStyle}>
              {galleryAudit.missingAltText}
            </div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>Low Image Count</div>
            <div style={warningStatValueStyle}>
              {galleryAudit.lowImageCount}
            </div>
          </div>
        </div>

        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Search</label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, slug, collection, short description"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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

      <div style={bulkBarStyle}>
        <div style={bulkInfoStyle}>
          <strong>{selectedSlugs.length}</strong> product(s) selected
        </div>

        <div style={bulkControlsStyle}>
          <button
            type="button"
            onClick={toggleSelectAllCurrentPage}
            style={secondarySmallButtonStyle}
          >
            {allCurrentPageSelected ? "Unselect Page" : "Select Page"}
          </button>

          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            style={bulkInputStyle}
          >
            <option value="">Bulk Status</option>
            <option value="published">published</option>
            <option value="draft">draft</option>
            <option value="archived">archived</option>
          </select>

          <select
            value={bulkFeatured}
            onChange={(e) => setBulkFeatured(e.target.value)}
            style={bulkInputStyle}
          >
            <option value="">Bulk Featured</option>
            <option value="TRUE">TRUE</option>
            <option value="FALSE">FALSE</option>
          </select>

          <input
            value={bulkCollectionSlug}
            onChange={(e) => setBulkCollectionSlug(e.target.value)}
            placeholder="Bulk Collection Slug"
            style={bulkInputStyle}
          />

          <button
            type="button"
            onClick={handleBulkUpdate}
            disabled={!canApplyBulkUpdate}
            style={canApplyBulkUpdate ? primarySmallButtonStyle : disabledButtonStyle}
          >
            {bulkLoading ? "Updating..." : "Apply Bulk Update"}
          </button>
        </div>

        {bulkHint ? <div style={hintTextStyle}>{bulkHint}</div> : null}
        {bulkMessage ? <div style={successMessageStyle}>{bulkMessage}</div> : null}
        {bulkError ? <div style={errorInlineStyle}>{bulkError}</div> : null}
      </div>

      {loading || imagesLoading ? (
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
                  <th style={thStyle}>
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={toggleSelectAllCurrentPage}
                    />
                  </th>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Slug</th>
                  <th style={thStyle}>Collection</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Gallery</th>
                  <th style={thStyle}>Warnings</th>
                  <th style={thStyle}>Updated</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const galleryState = getGalleryState(item, imageMap);
                  const featured =
                    String(item.featured || "").toLowerCase() === "true";
                  const slug = normalizeText(item.slug);
                  const checked = slug ? selectedSlugs.includes(slug) : false;

                  return (
                    <tr key={item.id || item.slug || index}>
                      <td style={tdStyle}>
                        {slug ? (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelectOne(slug)}
                          />
                        ) : null}
                      </td>

                      <td style={tdStyle}>
                        <div style={productCellStyle}>
                          <div style={thumbWrapStyle}>
                            {galleryState.primaryImage ? (
                              <img
                                src={galleryState.primaryImage}
                                alt={item.title || "Product"}
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
                            </div>

                            <div
                              style={{
                                color: "#6f6559",
                                fontSize: 13,
                                lineHeight: 1.6,
                              }}
                            >
                              {item.short_description ||
                                "No short description added yet."}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={tdStyle}>{item.slug || "-"}</td>
                      <td style={tdStyle}>{item.collection_slug || "-"}</td>

                      <td style={tdStyle}>
                        <StatusBadge value={item.status || "-"} />
                      </td>

                      <td style={tdStyle}>
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={galleryScoreWrapStyle}>
                            <div style={galleryScoreLabelStyle}>Readiness</div>
                            <div style={galleryScoreValueStyle}>
                              {galleryState.score}%
                            </div>
                          </div>

                          <div style={galleryMetaStyle}>
                            <div>
                              <strong>Images:</strong> {galleryState.imageCount}
                            </div>
                            <div>
                              <strong>Main:</strong>{" "}
                              {galleryState.mainImageExists ? "Yes" : "No"}
                            </div>
                            <div>
                              <strong>Alt:</strong> {galleryState.altCount}/
                              {galleryState.imageCount}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        {galleryState.issues.length === 0 ? (
                          <span style={okBadgeStyle}>Gallery looks good</span>
                        ) : (
                          <div style={warningListStyle}>
                            {galleryState.issues.map((issue) => (
                              <span key={issue} style={warningBadgeStyle}>
                                {issue}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td style={tdStyle}>{item.updated_at || "-"}</td>

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
              onClick={() =>
                setPage((prev) => Math.min(totalPages, prev + 1))
              }
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

const bulkBarStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
  display: "grid",
  gap: 16,
};

const bulkInfoStyle: React.CSSProperties = {
  fontSize: 15,
  color: "#5f564b",
};

const bulkControlsStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const bulkInputStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 14,
};

const hintTextStyle: React.CSSProperties = {
  color: "#7d7266",
  fontSize: 14,
  fontWeight: 600,
};

const successMessageStyle: React.CSSProperties = {
  color: "#1d6a43",
  fontWeight: 700,
  fontSize: 14,
};

const errorInlineStyle: React.CSSProperties = {
  color: "#8d2f2f",
  fontWeight: 700,
  fontSize: 14,
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

const warningStatBoxStyle: React.CSSProperties = {
  minWidth: 180,
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

const galleryMetaStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  color: "#5f564c",
  lineHeight: 1.5,
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

const disabledButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #d8d8d8",
  background: "#f3f3f3",
  color: "#8a8a8a",
  fontWeight: 700,
  cursor: "not-allowed",
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
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
};