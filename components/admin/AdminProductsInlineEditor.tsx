"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { normalizeImageUrl } from "../../lib/image-url";

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

type EditableRow = {
  title: string;
  collection_slug: string;
  status: string;
  featured: string;
};

type Props = {
  items: ProductItem[];
  allImages: ProductImageItem[];
  deleteLoadingSlug: string;
  onDelete: (slug?: string) => Promise<void>;
  onReload: () => Promise<void>;
};

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

export default function AdminProductsInlineEditor({
  items,
  allImages,
  deleteLoadingSlug,
  onDelete,
  onReload,
}: Props) {
  const imageMap = useMemo(() => buildImageMap(allImages), [allImages]);

  const [drafts, setDrafts] = useState<Record<string, EditableRow>>({});
  const [saveLoadingSlug, setSaveLoadingSlug] = useState("");
  const [rowMessage, setRowMessage] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});

  function getDraft(item: ProductItem): EditableRow {
    const slug = normalizeText(item.slug);

    if (slug && drafts[slug]) {
      return drafts[slug];
    }

    return {
      title: normalizeText(item.title),
      collection_slug: normalizeText(item.collection_slug),
      status: normalizeText(item.status),
      featured: normalizeText(item.featured),
    };
  }

  function updateDraft(
    slug: string,
    field: keyof EditableRow,
    value: string,
    item: ProductItem
  ) {
    setDrafts((prev) => ({
      ...prev,
      [slug]: {
        ...getDraft(item),
        ...prev[slug],
        [field]: value,
      },
    }));

    setRowMessage((prev) => ({ ...prev, [slug]: "" }));
    setRowError((prev) => ({ ...prev, [slug]: "" }));
  }

  function isDirty(item: ProductItem) {
    const slug = normalizeText(item.slug);
    if (!slug || !drafts[slug]) return false;

    const draft = drafts[slug];

    return (
      normalizeText(draft.title) !== normalizeText(item.title) ||
      normalizeText(draft.collection_slug) !== normalizeText(item.collection_slug) ||
      normalizeText(draft.status) !== normalizeText(item.status) ||
      normalizeText(draft.featured) !== normalizeText(item.featured)
    );
  }

  async function handleSave(item: ProductItem) {
    const slug = normalizeText(item.slug);
    if (!slug) return;

    const draft = getDraft(item);

    try {
      setSaveLoadingSlug(slug);
      setRowMessage((prev) => ({ ...prev, [slug]: "" }));
      setRowError((prev) => ({ ...prev, [slug]: "" }));

      const response = await fetch(`/api/admin/products/${slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: draft.title,
          collection_slug: draft.collection_slug,
          status: draft.status,
          featured: draft.featured,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to update product.");
      }

      setRowMessage((prev) => ({
        ...prev,
        [slug]: "Saved",
      }));

      setDrafts((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });

      await onReload();
    } catch (error) {
      setRowError((prev) => ({
        ...prev,
        [slug]:
          error instanceof Error ? error.message : "Failed to update product.",
      }));
    } finally {
      setSaveLoadingSlug("");
    }
  }

  return (
    <div style={tableCardStyle}>
      <div style={tableScrollStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Collection</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Featured</th>
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
              const draft = getDraft(item);
              const dirty = isDirty(item);

              return (
                <tr key={item.id || item.slug || index}>
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

                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={productTitleRowStyle}>
                          <div style={{ fontWeight: 800 }}>
                            {item.title || "-"}
                          </div>
                          {featured ? (
                            <span style={featuredBadgeStyle}>Featured</span>
                          ) : null}
                        </div>

                        <input
                          value={draft.title}
                          onChange={(e) =>
                            updateDraft(slug, "title", e.target.value, item)
                          }
                          placeholder="Product title"
                          style={inlineInputStyle}
                        />

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

                  <td style={tdStyle}>
                    <input
                      value={draft.collection_slug}
                      onChange={(e) =>
                        updateDraft(slug, "collection_slug", e.target.value, item)
                      }
                      placeholder="collection slug"
                      style={inlineInputStyle}
                    />
                  </td>

                  <td style={tdStyle}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <StatusBadge value={item.status || "-"} />
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          updateDraft(slug, "status", e.target.value, item)
                        }
                        style={inlineSelectStyle}
                      >
                        <option value="published">published</option>
                        <option value="draft">draft</option>
                        <option value="archived">archived</option>
                      </select>
                    </div>
                  </td>

                  <td style={tdStyle}>
                    <select
                      value={draft.featured}
                      onChange={(e) =>
                        updateDraft(slug, "featured", e.target.value, item)
                      }
                      style={inlineSelectStyle}
                    >
                      <option value="TRUE">TRUE</option>
                      <option value="FALSE">FALSE</option>
                    </select>
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

                      {slug ? (
                        <button
                          type="button"
                          onClick={() => handleSave(item)}
                          style={dirty ? saveButtonDirtyStyle : saveButtonStyle}
                          disabled={saveLoadingSlug === slug || !dirty}
                        >
                          {saveLoadingSlug === slug ? "Saving..." : "Save"}
                        </button>
                      ) : null}

                      {item.slug ? (
                        <button
                          type="button"
                          onClick={() => onDelete(item.slug)}
                          style={dangerSmallButtonStyle}
                          disabled={deleteLoadingSlug === item.slug}
                        >
                          {deleteLoadingSlug === item.slug
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      ) : null}
                    </div>

                    {slug && rowMessage[slug] ? (
                      <div style={rowSuccessStyle}>{rowMessage[slug]}</div>
                    ) : null}

                    {slug && rowError[slug] ? (
                      <div style={rowErrorStyle}>{rowError[slug]}</div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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

const saveButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#f3f3f3",
  color: "#8a8a8a",
  fontWeight: 700,
  cursor: "not-allowed",
  textDecoration: "none",
  fontSize: 14,
};

const saveButtonDirtyStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #0f172a",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 14,
};

const inlineInputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 14,
};

const inlineSelectStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 14,
};

const rowSuccessStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#1d6a43",
  fontSize: 13,
  fontWeight: 700,
};

const rowErrorStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#8d2f2f",
  fontSize: 13,
  fontWeight: 700,
};