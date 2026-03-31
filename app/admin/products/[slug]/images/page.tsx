"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { normalizeImageUrl } from "../../../../../lib/image-url";

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

type UploadQueueItem = {
  localId: string;
  file: File;
  preview: string;
  alt_text: string;
  is_main: boolean;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function isTrue(value?: string) {
  return String(value || "").trim().toLowerCase() === "true";
}

function toSafeOrder(value?: string) {
  const num = Number(String(value || "").trim());
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

function moveItem<T>(array: T[], fromIndex: number, toIndex: number) {
  const copy = [...array];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  return copy;
}

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

  const [editingId, setEditingId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [altText, setAltText] = useState("");
  const [isMain, setIsMain] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [deleteLoadingId, setDeleteLoadingId] = useState("");
  const [fileUploading, setFileUploading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [reorderSaving, setReorderSaving] = useState(false);

  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const dragIndexRef = useRef<number | null>(null);

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

      setItems(sortImages(data.items || []));
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

  const hasPendingReorder = useMemo(() => {
    return items.some(
      (item, index) => Number(item.sort_order || "999") !== index + 1
    );
  }, [items]);

  function resetForm() {
    setEditingId("");
    setImageUrl("");
    setSortOrder("");
    setAltText("");
    setIsMain(false);
    setSaveError("");
    setSaveMessage("");
  }

  function handleEdit(item: ProductImageItem) {
    setEditingId(String(item.id || ""));
    setImageUrl(String(item.image_url || ""));
    setSortOrder(String(item.sort_order || ""));
    setAltText(String(item.alt_text || ""));
    setIsMain(String(item.is_main || "").trim().toLowerCase() === "true");
    setSaveError("");
    setSaveMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
      setSaveMessage("Image uploaded successfully. Save it to continue.");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setFileUploading(false);
    }
  }

  function handleQueueFiles(files: FileList | null) {
    if (!files?.length) return;

    const nextItems: UploadQueueItem[] = Array.from(files).map((file, index) => ({
      localId: `${Date.now()}-${index}-${file.name}`,
      file,
      preview: URL.createObjectURL(file),
      alt_text: "",
      is_main: false,
    }));

    setQueue((prev) => [...prev, ...nextItems]);
  }

  function updateQueueItem(localId: string, patch: Partial<UploadQueueItem>) {
    setQueue((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item
      )
    );
  }

  function removeQueueItem(localId: string) {
    setQueue((prev) => {
      const target = prev.find((item) => item.localId === localId);
      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((item) => item.localId !== localId);
    });
  }

  async function uploadSingleFile(file: File) {
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

    return String(data.url || "").trim();
  }

  async function handleBulkUpload() {
    if (queue.length === 0) return;

    try {
      setBulkUploading(true);
      setSaveError("");
      setSaveMessage("");

      for (let i = 0; i < queue.length; i += 1) {
        const queueItem = queue[i];
        const uploadedUrl = await uploadSingleFile(queueItem.file);

        const response = await fetch("/api/product-images/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_slug: slug,
            image_url: uploadedUrl,
            sort_order: String(items.length + i + 1),
            alt_text: queueItem.alt_text,
            is_main: queueItem.is_main ? "true" : "false",
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data?.error || "Failed to create product image.");
        }
      }

      queue.forEach((item) => {
        if (item.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });

      setQueue([]);
      setSaveMessage("Bulk upload completed successfully.");
      await loadImages();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Bulk upload failed."
      );
    } finally {
      setBulkUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const endpoint = editingId
        ? "/api/product-images/update"
        : "/api/product-images/create";

      const payload = editingId
        ? {
            id: editingId,
            image_url: imageUrl,
            sort_order: sortOrder,
            alt_text: altText,
            is_main: isMain ? "true" : "false",
          }
        : {
            product_slug: slug,
            image_url: imageUrl,
            sort_order: sortOrder || String(items.length + 1),
            alt_text: altText,
            is_main: isMain ? "true" : "false",
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data?.error ||
            (editingId ? "Failed to update image." : "Failed to create image.")
        );
      }

      setSaveMessage(
        editingId
          ? "Product image updated successfully."
          : "Product image added successfully."
      );

      resetForm();
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

      if (editingId === id) {
        resetForm();
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

  async function handleSetMain(item: ProductImageItem) {
    try {
      setSaveError("");
      setSaveMessage("");

      const response = await fetch("/api/product-images/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          image_url: item.image_url,
          sort_order: item.sort_order,
          alt_text: item.alt_text,
          is_main: "true",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to set main image.");
      }

      setSaveMessage("Main image updated successfully.");
      await loadImages();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to set main image."
      );
    }
  }

  function handleMoveUp(index: number) {
    if (index <= 0) return;
    setItems((prev) => moveItem(prev, index, index - 1));
  }

  function handleMoveDown(index: number) {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev;
      return moveItem(prev, index, index + 1);
    });
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDrop(index: number) {
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === index) return;

    setItems((prev) => moveItem(prev, dragIndex, index));
    dragIndexRef.current = null;
  }

  async function handleSaveReorder() {
    try {
      setReorderSaving(true);
      setSaveError("");
      setSaveMessage("");

      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];

        const response = await fetch("/api/product-images/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: item.id,
            image_url: item.image_url,
            sort_order: String(i + 1),
            alt_text: item.alt_text,
            is_main: isTrue(item.is_main) ? "true" : "false",
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data?.error || "Failed to save reorder.");
        }
      }

      setSaveMessage("Image order updated successfully.");
      await loadImages();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save image order."
      );
    } finally {
      setReorderSaving(false);
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
            Manage gallery images, choose the main image, bulk upload files,
            and reorder the gallery with drag & drop or quick controls.
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
          <div style={formHeaderRowStyle}>
            <h2 style={sectionTitleStyle}>
              {editingId ? "Edit Image" : "Add Image"}
            </h2>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                style={secondaryButtonStyle}
              >
                Cancel Edit
              </button>
            ) : null}
          </div>

          <div style={noticeBoxStyle}>
            The image marked as <strong>Main Image</strong> becomes the product’s
            primary display image across listing and detail pages.
          </div>

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

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={checkboxWrapStyle}>
                <input
                  type="checkbox"
                  checked={isMain}
                  onChange={(e) => setIsMain(e.target.checked)}
                />
                <span>Set as main image</span>
              </label>
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
              {saving
                ? editingId
                  ? "Updating..."
                  : "Saving..."
                : editingId
                  ? "Update Image"
                  : "Add Image"}
            </button>
          </div>

          {saveMessage ? <div style={successBoxStyle}>{saveMessage}</div> : null}
          {saveError ? <div style={errorBoxStyle}>{saveError}</div> : null}
        </form>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Bulk Upload</h2>
          <div style={noticeBoxStyle}>
            Select multiple files, add alt text, and upload all in one step.
          </div>

          <div>
            <label style={labelStyle}>Upload Multiple Images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleQueueFiles(e.target.files)}
              style={inputStyle}
            />
          </div>

          {queue.length > 0 ? (
            <>
              <div style={queueGridStyle}>
                {queue.map((item, index) => (
                  <div key={item.localId} style={queueCardStyle}>
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      style={queueImageStyle}
                    />

                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={queueTitleStyle}>
                        {index + 1}. {item.file.name}
                      </div>

                      <input
                        value={item.alt_text}
                        onChange={(e) =>
                          updateQueueItem(item.localId, {
                            alt_text: e.target.value,
                          })
                        }
                        placeholder="Alt text"
                        style={smallInputStyle}
                      />

                      <label style={checkboxWrapStyle}>
                        <input
                          type="checkbox"
                          checked={item.is_main}
                          onChange={(e) =>
                            updateQueueItem(item.localId, {
                              is_main: e.target.checked,
                            })
                          }
                        />
                        <span>Main image</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => removeQueueItem(item.localId)}
                        style={dangerSmallButtonStyle}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={buttonRowStyle}>
                <button
                  type="button"
                  onClick={handleBulkUpload}
                  style={primaryButtonStyle}
                  disabled={bulkUploading}
                >
                  {bulkUploading ? "Uploading..." : "Upload All"}
                </button>
              </div>
            </>
          ) : (
            <div style={emptyStateStyle}>No files in queue yet.</div>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={reorderHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Existing Images</h2>
            <p style={subtitleStyle}>
              Drag images to reorder them or use the small up/down buttons.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveReorder}
            style={primaryButtonStyle}
            disabled={reorderSaving || !hasPendingReorder}
          >
            {reorderSaving ? "Saving Order..." : "Save Order"}
          </button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : errorMessage ? (
          <div style={errorBoxStyle}>{errorMessage}</div>
        ) : items.length === 0 ? (
          <div style={emptyStateStyle}>No product images added yet.</div>
        ) : (
          <div style={listStyle}>
            {items.map((item, index) => {
              const itemIsMain =
                String(item.is_main || "").trim().toLowerCase() === "true";

              return (
                <div
                  key={item.id || index}
                  style={listCardStyle}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(index)}
                >
                  <img
                    src={normalizeImageUrl(item.image_url || "")}
                    alt={item.alt_text || "Product image"}
                    style={imageStyle}
                  />

                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={metaRowStyle}>
                      <strong>Sort:</strong> {index + 1}
                    </div>

                    <div style={metaRowStyle}>
                      <strong>Alt:</strong> {item.alt_text || "-"}
                    </div>

                    <div style={metaRowStyle}>
                      <strong>Status:</strong>{" "}
                      {itemIsMain ? (
                        <span style={mainBadgeStyle}>Main Image</span>
                      ) : (
                        <span style={subtleBadgeStyle}>Gallery Image</span>
                      )}
                    </div>

                    <div style={urlStyle}>{item.image_url || "-"}</div>

                    <div style={miniReorderWrapStyle}>
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        style={iconSmallButtonStyle}
                        disabled={index === 0}
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        style={iconSmallButtonStyle}
                        disabled={index === items.length - 1}
                      >
                        ↓
                      </button>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      {!itemIsMain ? (
                        <button
                          type="button"
                          onClick={() => handleSetMain(item)}
                          style={primarySmallButtonStyle}
                        >
                          Set Main
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        style={editSmallButtonStyle}
                      >
                        Edit
                      </button>

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
              );
            })}
          </div>
        )}

        {saveMessage ? <div style={successBoxStyle}>{saveMessage}</div> : null}
        {saveError ? <div style={errorBoxStyle}>{saveError}</div> : null}
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Variant Image Binding</h2>
        <div style={noticeBoxStyle}>
          Open the variant image screen to connect gallery images with product variants.
        </div>

        <div style={buttonRowStyle}>
          <Link
            href={`/admin/products/${slug}/variant-images`}
            style={primaryButtonStyle}
          >
            Open Variant Image Binding
          </Link>
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

const formHeaderRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 18,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800,
};

const noticeBoxStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 16,
  background: "#f8f5ef",
  border: "1px solid #e3dbcf",
  color: "#5f564c",
  fontSize: 14,
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

const smallInputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 42,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 14,
};

const helperTextStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  color: "#7d7266",
};

const checkboxWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
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

const queueGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const queueCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "110px 1fr",
  gap: 14,
  padding: 14,
  borderRadius: 18,
  border: "1px solid #e8dfd2",
  background: "#fcfbf8",
};

const queueImageStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  borderRadius: 12,
  background: "#f5f5f5",
};

const queueTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 14,
  lineHeight: 1.5,
  wordBreak: "break-word",
};

const reorderHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 18,
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
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
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
  fontSize: 14,
};

const editSmallButtonStyle: React.CSSProperties = {
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
  fontSize: 14,
};

const iconSmallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  minWidth: 38,
  height: 38,
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
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

const metaRowStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#2a2a2a",
};

const mainBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#eef8f0",
  color: "#1f6a45",
  border: "1px solid #cfe5d4",
  fontWeight: 800,
  fontSize: 12,
};

const subtleBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#f5f3ef",
  color: "#6f6559",
  border: "1px solid #e3dbcf",
  fontWeight: 800,
  fontSize: 12,
};

const urlStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6f6559",
  wordBreak: "break-all",
};

const miniReorderWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};