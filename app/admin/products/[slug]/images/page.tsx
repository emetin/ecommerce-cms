"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeImageUrl } from "../../../../../lib/image-url";

type ProductImageItem = {
  id?: string;
  product_slug?: string;
  image_url?: string;
  image_file_id?: string;
  image_uploaded_at?: string;
  sort_order?: string;
  alt_text?: string;
  is_main?: string;
  created_at?: string;
  updated_at?: string;
};

type ProductItem = {
  title?: string;
  slug?: string;
  image?: string;
  gallery?: string;
  collection_slug?: string;
  status?: string;
  featured?: string;
  seo_title?: string;
  seo_description?: string;
  description?: string;
  short_description?: string;
  vendor?: string;
  product_category?: string;
  type?: string;
  tags?: string;
};

function isTrue(value?: string) {
  return String(value || "").trim().toLowerCase() === "true";
}

function toSafeOrder(value?: string) {
  const num = Number(String(value || "").trim());
  return Number.isFinite(num) ? num : 999999;
}

function sortImages(items: ProductImageItem[]) {
  return [...items].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    return toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
  });
}

function normalizeStatus(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "published" ||
    normalized === "draft" ||
    normalized === "archived"
  ) {
    return normalized;
  }
  return "draft";
}

function normalizeFeatured(value?: string) {
  return String(value || "").trim().toLowerCase() === "true" ? "true" : "false";
}

export default function AdminProductImagesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = use(params);
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();

  const [product, setProduct] = useState<ProductItem | null>(null);
  const [items, setItems] = useState<ProductImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [resultError, setResultError] = useState("");

  const [newAltText, setNewAltText] = useState("");
  const [newSortOrder, setNewSortOrder] = useState("");
  const [newIsMain, setNewIsMain] = useState("false");

  const [replacingId, setReplacingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [savingId, setSavingId] = useState("");
  const [fixingAltTexts, setFixingAltTexts] = useState(false);

  const createInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const sortedItems = useMemo(() => sortImages(items), [items]);

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const [productResponse, imagesResponse] = await Promise.all([
        fetch(`/api/products/get?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        }),
        fetch(
          `/api/product-images/list?product_slug=${encodeURIComponent(slug)}`,
          {
            cache: "no-store",
          }
        ),
      ]);

      const productData = await productResponse.json();
      const imagesData = await imagesResponse.json();

      if (!productResponse.ok || !productData.ok) {
        throw new Error(productData?.error || "Failed to load product.");
      }

      if (!imagesResponse.ok || !imagesData.ok) {
        throw new Error(imagesData?.error || "Failed to load product images.");
      }

      setProduct(productData.item || null);
      setItems(Array.isArray(imagesData.items) ? imagesData.items : []);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function syncProductMainImage(nextItems: ProductImageItem[]) {
    const mainItem =
      nextItems.find((item) => isTrue(item.is_main)) ||
      sortImages(nextItems)[0] ||
      null;

    const response = await fetch("/api/products/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slug,
        title: product?.title || "",
        description: product?.description || "",
        short_description: product?.short_description || "",
        image: mainItem?.image_url || "",
        gallery: product?.gallery || "",
        collection_slug: product?.collection_slug || "",
        status: normalizeStatus(product?.status),
        featured: normalizeFeatured(product?.featured),
        seo_title: product?.seo_title || "",
        seo_description: product?.seo_description || "",
        vendor: product?.vendor || "",
        product_category: product?.product_category || "",
        type: product?.type || "",
        tags: product?.tags || "",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data?.error || "Failed to sync product main image.");
    }

    setProduct((prev) => ({
      ...(prev || {}),
      image: mainItem?.image_url || "",
      status: normalizeStatus(prev?.status),
      featured: normalizeFeatured(prev?.featured),
    }));
  }

  async function uploadSingleImage(file: File, index: number, totalFiles: number) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", "product");

    if (newAltText.trim()) {
      formData.append("alt", newAltText.trim());
    }

    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok || !uploadData.ok || !uploadData.url) {
      throw new Error(uploadData?.error || "Failed to upload image.");
    }

    const baseSort = Number(newSortOrder || "0");
    const computedSortOrder =
      Number.isFinite(baseSort) && baseSort > 0
        ? String(baseSort + index)
        : String(items.length + index + 1);

    const computedIsMain =
      newIsMain === "true" && index === 0 ? "true" : "false";

    const createResponse = await fetch("/api/product-images/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_slug: slug,
        image_url: uploadData.url,
        image_file_id: uploadData.file_id || uploadData.file_name || "",
        image_uploaded_at: uploadData.uploaded_at || new Date().toISOString(),
        sort_order: computedSortOrder,
        alt_text: newAltText.trim(),
        is_main: computedIsMain,
      }),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok || !createData.ok) {
      throw new Error(createData?.error || "Failed to save gallery image.");
    }

    return createData.item as ProductImageItem;
  }

  async function handleCreateImage(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadError("");
    setResultMessage("");
    setResultError("");
    setUploading(true);

    try {
      const createdItems: ProductImageItem[] = [];

      for (let i = 0; i < files.length; i += 1) {
        const created = await uploadSingleImage(files[i], i, files.length);
        createdItems.push(created);
      }

      const nextItems = [...items, ...createdItems];
      setItems(nextItems);

      if (newIsMain === "true") {
        const firstCreatedMainId = createdItems[0]?.id;
        if (firstCreatedMainId) {
          await handleSetMain(firstCreatedMainId, nextItems);
        } else {
          await syncProductMainImage(nextItems);
        }
      } else {
        await syncProductMainImage(nextItems);
      }

      setNewAltText("");
      setNewSortOrder("");
      setNewIsMain("false");

      setResultMessage(
        files.length === 1
          ? "Gallery image added successfully."
          : `${files.length} gallery images added successfully.`
      );
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to add gallery image."
      );
    } finally {
      setUploading(false);
      if (createInputRef.current) {
        createInputRef.current.value = "";
      }
    }
  }

  async function handleReplaceImage(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file || !replacingId) return;

    setUploadError("");
    setResultMessage("");
    setResultError("");
    setUploading(true);

    try {
      const current = items.find((item) => item.id === replacingId);

      if (!current) {
        throw new Error("Selected gallery image was not found.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", "product");

      if (String(current.alt_text || "").trim()) {
        formData.append("alt", String(current.alt_text || "").trim());
      }

      formData.append("deleteOldFile", "true");
      formData.append("oldImageUrl", current.image_url || "");
      formData.append("oldImageFileId", current.image_file_id || "");

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData.ok || !uploadData.url) {
        throw new Error(uploadData?.error || "Failed to replace gallery image.");
      }

      const updateResponse = await fetch("/api/product-images/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: current.id,
          product_slug: current.product_slug,
          image_url: uploadData.url,
          image_file_id: uploadData.file_id || uploadData.file_name || "",
          image_uploaded_at: uploadData.uploaded_at || new Date().toISOString(),
          sort_order: current.sort_order,
          alt_text: current.alt_text,
          is_main: current.is_main,
        }),
      });

      const updateData = await updateResponse.json();

      if (!updateResponse.ok || !updateData.ok) {
        throw new Error(updateData?.error || "Failed to update gallery image row.");
      }

      const nextItems = items.map((item) =>
        item.id === replacingId ? updateData.item : item
      );

      setItems(nextItems);
      await syncProductMainImage(nextItems);
      setResultMessage("Gallery image replaced successfully.");
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to replace gallery image."
      );
    } finally {
      setUploading(false);
      setReplacingId("");
      if (replaceInputRef.current) {
        replaceInputRef.current.value = "";
      }
    }
  }

  async function handleDeleteImage(item: ProductImageItem) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this gallery image?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(item.id || "");
      setResultMessage("");
      setResultError("");

      const response = await fetch("/api/product-images/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          delete_local_file: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to delete gallery image.");
      }

      const nextItems = items.filter((image) => image.id !== item.id);
      setItems(nextItems);
      await syncProductMainImage(nextItems);
      setResultMessage("Gallery image deleted successfully.");
    } catch (error) {
      setResultError(
        error instanceof Error ? error.message : "Failed to delete gallery image."
      );
    } finally {
      setDeletingId("");
    }
  }

  async function handleSaveImage(item: ProductImageItem) {
    try {
      setSavingId(item.id || "");
      setResultMessage("");
      setResultError("");

      const response = await fetch("/api/product-images/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          product_slug: item.product_slug,
          image_url: item.image_url,
          image_file_id: item.image_file_id,
          image_uploaded_at: item.image_uploaded_at,
          sort_order: item.sort_order,
          alt_text: item.alt_text,
          is_main: item.is_main,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to save gallery image.");
      }

      const nextItems = items.map((image) =>
        image.id === item.id ? data.item : image
      );

      setItems(nextItems);
      await syncProductMainImage(nextItems);
      setResultMessage("Gallery image updated successfully.");
    } catch (error) {
      setResultError(
        error instanceof Error ? error.message : "Failed to update gallery image."
      );
    } finally {
      setSavingId("");
    }
  }

  async function handleSetMain(
    targetId?: string,
    sourceItems?: ProductImageItem[]
  ) {
    if (!targetId) return;

    try {
      setResultMessage("");
      setResultError("");

      const baseItems = sourceItems || items;
      const updatedItems = [...baseItems];

      for (const item of updatedItems) {
        const nextIsMain = item.id === targetId ? "true" : "false";

        if (String(item.is_main || "false") === nextIsMain) {
          continue;
        }

        const response = await fetch("/api/product-images/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: item.id,
            product_slug: item.product_slug,
            image_url: item.image_url,
            image_file_id: item.image_file_id,
            image_uploaded_at: item.image_uploaded_at,
            sort_order: item.sort_order,
            alt_text: item.alt_text,
            is_main: nextIsMain,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data?.error || "Failed to set main image.");
        }

        const index = updatedItems.findIndex((x) => x.id === item.id);
        if (index !== -1) {
          updatedItems[index] = data.item;
        }
      }

      setItems(updatedItems);
      await syncProductMainImage(updatedItems);
      setResultMessage("Main image updated successfully.");
    } catch (error) {
      setResultError(
        error instanceof Error ? error.message : "Failed to set main image."
      );
    }
  }

  async function handleFixMissingAltTexts() {
    try {
      setFixingAltTexts(true);
      setResultMessage("");
      setResultError("");

      const response = await fetch("/api/product-images/fix-missing-alt-texts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "overwrite_weak",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to fix image alt texts.");
      }

      await loadPage();
      setResultMessage(data?.message || "Image alt texts fixed successfully.");
    } catch (error) {
      setResultError(
        error instanceof Error ? error.message : "Failed to fix image alt texts."
      );
    } finally {
      setFixingAltTexts(false);
    }
  }

  if (loading) {
    return <div style={cardStyle}>Loading...</div>;
  }

  if (pageError) {
    return <div style={errorBoxStyle}>{pageError}</div>;
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={pageHeaderStyle}>
        <div>
          <Link href={`/admin/products/${slug}`} style={backLinkStyle}>
            ← Back to Product
          </Link>
          <h1 style={titleStyle}>Image Manager</h1>
          <p style={subtitleStyle}>
            Manage gallery images for <strong>{product?.title || slug}</strong>.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <Link href={`/products/${slug}`} style={secondaryButtonStyle}>
            View Product
          </Link>

          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={handleFixMissingAltTexts}
            disabled={fixingAltTexts}
          >
            {fixingAltTexts ? "Fixing Alt Texts..." : "Fix Missing Alt Texts"}
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Add New Gallery Image</h2>

        <div style={formGridStyle}>
          <div>
            <label style={labelStyle}>Alt Text</label>
            <input
              value={newAltText}
              onChange={(e) => setNewAltText(e.target.value)}
              style={inputStyle}
              placeholder="Leave empty for auto-generated alt text"
            />
          </div>

          <div>
            <label style={labelStyle}>Sort Order</label>
            <input
              value={newSortOrder}
              onChange={(e) => setNewSortOrder(e.target.value)}
              style={inputStyle}
              placeholder="1"
            />
          </div>

          <div>
            <label style={labelStyle}>Is Main</label>
            <select
              value={newIsMain}
              onChange={(e) => setNewIsMain(e.target.value)}
              style={inputStyle}
            >
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Upload</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                ref={createInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleCreateImage}
                style={{ display: "none" }}
              />

              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => createInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Image(s)"}
              </button>
            </div>
          </div>
        </div>

        {uploadError ? <div style={errorBoxStyle}>{uploadError}</div> : null}
        {resultMessage ? <div style={successBoxStyle}>{resultMessage}</div> : null}
        {resultError ? <div style={errorBoxStyle}>{resultError}</div> : null}
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        onChange={handleReplaceImage}
        style={{ display: "none" }}
      />

      <div style={gridStyle}>
        {sortedItems.length === 0 ? (
          <div style={emptyStateStyle}>No gallery images found.</div>
        ) : (
          sortedItems.map((item) => (
            <div key={item.id} style={imageCardStyle}>
              <img
                src={normalizeImageUrl(item.image_url || "")}
                alt={item.alt_text || "Gallery image"}
                style={imageStyle}
              />

              <div style={imageMetaStyle}>
                <div style={badgeRowStyle}>
                  {isTrue(item.is_main) ? (
                    <span style={mainBadgeStyle}>Main</span>
                  ) : (
                    <span style={secondaryBadgeStyle}>Gallery</span>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Alt Text</label>
                  <input
                    value={item.alt_text || ""}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((image) =>
                          image.id === item.id
                            ? { ...image, alt_text: e.target.value }
                            : image
                        )
                      )
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Sort Order</label>
                  <input
                    value={item.sort_order || ""}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((image) =>
                          image.id === item.id
                            ? { ...image, sort_order: e.target.value }
                            : image
                        )
                      )
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>File ID</label>
                  <input
                    value={item.image_file_id || ""}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((image) =>
                          image.id === item.id
                            ? { ...image, image_file_id: e.target.value }
                            : image
                        )
                      )
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Uploaded At</label>
                  <input
                    value={item.image_uploaded_at || ""}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((image) =>
                          image.id === item.id
                            ? { ...image, image_uploaded_at: e.target.value }
                            : image
                        )
                      )
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={buttonWrapStyle}>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => {
                      setReplacingId(item.id || "");
                      replaceInputRef.current?.click();
                    }}
                    disabled={uploading}
                  >
                    {replacingId === item.id && uploading
                      ? "Replacing..."
                      : "Replace"}
                  </button>

                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => handleSetMain(item.id)}
                  >
                    Set Main
                  </button>

                  <button
                    type="button"
                    style={primaryButtonStyle}
                    onClick={() => handleSaveImage(item)}
                    disabled={savingId === item.id}
                  >
                    {savingId === item.id ? "Saving..." : "Save"}
                  </button>

                  <button
                    type="button"
                    style={dangerButtonStyle}
                    onClick={() => handleDeleteImage(item)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: 20,
};

const imageCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  overflow: "hidden",
  display: "grid",
  gridTemplateColumns: "320px 1fr",
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  minHeight: 240,
  background: "#f4f4f4",
};

const imageMetaStyle: React.CSSProperties = {
  padding: 20,
  display: "grid",
  gap: 14,
};

const badgeRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const mainBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 30,
  padding: "0 12px",
  borderRadius: 999,
  background: "#edf8f1",
  color: "#1d6a43",
  border: "1px solid #cfe7d8",
  fontWeight: 800,
  fontSize: 12,
};

const secondaryBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 30,
  padding: "0 12px",
  borderRadius: 999,
  background: "#f3f3f3",
  color: "#5e5e5e",
  border: "1px solid #dddddd",
  fontWeight: 800,
  fontSize: 12,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 800,
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 14,
};

const buttonWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 6,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 16px",
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
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};

const dangerButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 14,
  border: "1px solid #e5c9c9",
  background: "#fff5f5",
  color: "#8f2d2d",
  fontWeight: 800,
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

const emptyStateStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 20,
  padding: 20,
  color: "#6f6559",
  fontWeight: 700,
};