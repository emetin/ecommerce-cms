"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

type ProductImageItem = {
  id?: string;
  product_slug?: string;
  image_url?: string;
  alt_text?: string;
  is_main?: string;
  sort_order?: string;
  created_at?: string;
  updated_at?: string;
};

type VariantItem = {
  id?: string;
  product_slug?: string;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  sku?: string;
  barcode?: string;
  price?: string;
  compare_at_price?: string;
  inventory_tracker?: string;
  inventory_policy?: string;
  fulfillment_service?: string;
  requires_shipping?: string;
  taxable?: string;
  image_id?: string;
  weight?: string;
  weight_unit?: string;
  box_quantity?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type ProductMediaManagerProps = {
  productSlug: string;
};

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

function buildVariantLabel(variant: VariantItem) {
  const values = [
    String(variant.option1_value || "").trim(),
    String(variant.option2_value || "").trim(),
    String(variant.option3_value || "").trim(),
  ].filter(Boolean);

  if (values.length) {
    return values.join(" / ");
  }

  if (String(variant.sku || "").trim()) {
    return String(variant.sku || "").trim();
  }

  return "Default Variant";
}

export default function ProductMediaManager({
  productSlug,
}: ProductMediaManagerProps) {
  const safeSlug = String(productSlug || "").trim().toLowerCase();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [newAltText, setNewAltText] = useState("");
  const [newSortOrder, setNewSortOrder] = useState("999");
  const [newIsMain, setNewIsMain] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingImageId, setSavingImageId] = useState("");
  const [savingVariantId, setSavingVariantId] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  const [pickerReady, setPickerReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [pickerLoading, setPickerLoading] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const appId = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER || "";

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [imagesRes, variantsRes] = await Promise.all([
        fetch(
          `/api/product-images/list?product_slug=${encodeURIComponent(safeSlug)}`,
          { cache: "no-store" }
        ),
        fetch(`/api/variants/list?product_slug=${encodeURIComponent(safeSlug)}`, {
          cache: "no-store",
        }),
      ]);

      const imagesJson = await imagesRes.json();
      const variantsJson = await variantsRes.json();

      if (!imagesRes.ok || !imagesJson.ok) {
        throw new Error(imagesJson.error || "Failed to load product images.");
      }

      if (!variantsRes.ok || !variantsJson.ok) {
        throw new Error(variantsJson.error || "Failed to load variants.");
      }

      setImages(imagesJson.items || []);
      setVariants(variantsJson.items || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load media data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!safeSlug) return;
    loadData();
  }, [safeSlug]);

  const imageOptions = useMemo(() => {
    return images.map((item) => {
      const isMain = String(item.is_main || "").trim().toLowerCase() === "true";

      return {
        id: String(item.id || ""),
        label: isMain
          ? `${String(item.id || "")} (Main)`
          : String(item.id || ""),
      };
    });
  }, [images]);

  function handleGapiLoad() {
    if (!window.gapi) return;

    window.gapi.load("picker", () => {
      setPickerReady(true);
    });
  }

  function handleGisLoad() {
    if (!window.google?.accounts?.oauth2) return;

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive",
      callback: "",
    });

    setTokenClient(client);
    setGisReady(true);
  }

  async function createProductImageFromUrl(imageUrl: string, altText: string) {
    const createResponse = await fetch("/api/product-images/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_slug: safeSlug,
        image_url: imageUrl,
        alt_text: altText,
        is_main: newIsMain ? "true" : "false",
        sort_order: newSortOrder,
      }),
    });

    const createJson = await createResponse.json();

    if (!createResponse.ok || !createJson.ok) {
      throw new Error(createJson.error || "Failed to save image.");
    }
  }

  async function handleCreateImage(e: React.FormEvent) {
    e.preventDefault();

    if (!safeSlug) {
      setErrorMessage("Product slug is missing.");
      return;
    }

    const selectedFile = fileInputRef.current?.files?.[0];

    if (!selectedFile) {
      setErrorMessage("Please choose an image file.");
      return;
    }

    try {
      setCreating(true);
      setMessage("");
      setErrorMessage("");

      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);

      const uploadResponse = await fetch("/api/product-images/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadJson = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadJson.ok) {
        throw new Error(uploadJson.error || "Failed to upload image.");
      }

      const imageUrl = String(uploadJson.url || "").trim();

      if (!imageUrl) {
        throw new Error("Upload succeeded but no image URL was returned.");
      }

      await createProductImageFromUrl(imageUrl, newAltText);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSelectedFileName("");
      setNewAltText("");
      setNewSortOrder("999");
      setNewIsMain(false);
      setMessage("Image uploaded and added successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add image."
      );
    } finally {
      setCreating(false);
    }
  }

  async function makeDriveFilePublic(fileId: string, accessToken: string) {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Failed to make Drive file public. ${text || response.statusText}`
      );
    }
  }

  async function handlePickedDriveFile(doc: any, accessToken: string) {
    const fileId = String(doc.id || "").trim();
    const fileName = String(doc.name || doc[window.google?.picker?.Document?.NAME] || "Drive image");

    if (!fileId) {
      throw new Error("Selected Drive file has no id.");
    }

    await makeDriveFilePublic(fileId, accessToken);

    const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    await createProductImageFromUrl(imageUrl, fileName);

    setNewAltText("");
    setNewSortOrder("999");
    setNewIsMain(false);
    setMessage("Google Drive image added successfully.");
    await loadData();
  }

  function openDrivePicker() {
    if (!pickerReady || !gisReady || !tokenClient) {
      setErrorMessage("Google Drive Picker is not ready yet.");
      return;
    }

    if (!apiKey || !clientId || !appId) {
      setErrorMessage(
        "Google Picker env values are missing. Check NEXT_PUBLIC_GOOGLE_API_KEY, NEXT_PUBLIC_GOOGLE_CLIENT_ID, and NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER."
      );
      return;
    }

    try {
      setPickerLoading(true);
      setMessage("");
      setErrorMessage("");

      tokenClient.callback = async (tokenResponse: any) => {
        try {
          const accessToken = String(tokenResponse?.access_token || "").trim();

          if (!accessToken) {
            throw new Error("No Google access token was returned.");
          }

          const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
          view.setIncludeFolders(false);
          view.setMimeTypes("image/png,image/jpeg,image/jpg,image/webp,image/gif");

          const picker = new window.google.picker.PickerBuilder()
            .setDeveloperKey(apiKey)
            .setAppId(appId)
            .setOAuthToken(accessToken)
            .addView(view)
            .setTitle("Select an image from Google Drive")
            .setCallback(async (data: any) => {
              try {
                if (
                  data.action === window.google.picker.Action.PICKED &&
                  data.docs &&
                  data.docs.length > 0
                ) {
                  await handlePickedDriveFile(data.docs[0], accessToken);
                }
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Failed to add Drive image."
                );
              } finally {
                setPickerLoading(false);
              }
            })
            .build();

          picker.setVisible(true);
        } catch (error) {
          setPickerLoading(false);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to open Google Drive Picker."
          );
        }
      };

      tokenClient.requestAccessToken({ prompt: "consent" });
    } catch (error) {
      setPickerLoading(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to start Google Drive Picker."
      );
    }
  }

  async function handleSaveImage(image: ProductImageItem) {
    const imageId = String(image.id || "");

    if (!imageId) return;

    try {
      setSavingImageId(imageId);
      setMessage("");
      setErrorMessage("");

      const response = await fetch("/api/product-images/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: imageId,
          product_slug: safeSlug,
          image_url: String(image.image_url || ""),
          alt_text: String(image.alt_text || ""),
          is_main: String(image.is_main || "false"),
          sort_order: String(image.sort_order || "999"),
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to save image.");
      }

      setMessage("Image updated successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save image."
      );
    } finally {
      setSavingImageId("");
    }
  }

  async function handleDeleteImage(imageId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this image?"
    );

    if (!confirmed) return;

    try {
      setSavingImageId(imageId);
      setMessage("");
      setErrorMessage("");

      const response = await fetch("/api/product-images/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: imageId }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to delete image.");
      }

      setMessage("Image deleted successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete image."
      );
    } finally {
      setSavingImageId("");
    }
  }

  async function handleAssignVariantImage(variant: VariantItem, imageId: string) {
    const variantId = String(variant.id || "");

    if (!variantId) return;

    try {
      setSavingVariantId(variantId);
      setMessage("");
      setErrorMessage("");

      const response = await fetch("/api/variants/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: variantId,
          image_id: imageId,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to assign variant image.");
      }

      setMessage("Variant image updated successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to assign variant image."
      );
    } finally {
      setSavingVariantId("");
    }
  }

  return (
    <>
      <Script
        src="https://apis.google.com/js/api.js"
        strategy="afterInteractive"
        onLoad={handleGapiLoad}
      />
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={handleGisLoad}
      />

      <div style={wrapperStyle}>
        <div style={headerStyle}>
          <div>
            <div style={kickerStyle}>Product Media</div>
            <h2 style={titleStyle}>Media Library</h2>
            <p style={descriptionStyle}>
              Upload product images from your computer or pick existing images
              from Google Drive, choose the main image, control gallery order,
              and assign images to variants.
            </p>
          </div>
        </div>

        {message ? <div style={successBoxStyle}>{message}</div> : null}
        {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}

        <div style={topGridStyle}>
          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Add New Image</h3>

            <form onSubmit={handleCreateImage} style={{ display: "grid", gap: 14 }}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Choose File</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setSelectedFileName(file ? file.name : "");
                  }}
                  style={fileInputStyle}
                />
              </label>

              {selectedFileName ? (
                <div style={selectedFileStyle}>Selected: {selectedFileName}</div>
              ) : null}

              <label style={fieldStyle}>
                <span style={labelStyle}>Alt Text</span>
                <input
                  type="text"
                  value={newAltText}
                  onChange={(e) => setNewAltText(e.target.value)}
                  placeholder="Optional alt text"
                  style={inputStyle}
                />
              </label>

              <div style={inlineGridStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Sort Order</span>
                  <input
                    type="number"
                    value={newSortOrder}
                    onChange={(e) => setNewSortOrder(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={checkboxStyle}>
                  <input
                    type="checkbox"
                    checked={newIsMain}
                    onChange={(e) => setNewIsMain(e.target.checked)}
                  />
                  <span>Set as main image</span>
                </label>
              </div>

              <div style={buttonStackStyle}>
                <button type="submit" style={primaryButtonStyle} disabled={creating}>
                  {creating ? "Uploading..." : "Upload From Computer"}
                </button>

                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={pickerLoading || !pickerReady || !gisReady}
                  onClick={openDrivePicker}
                >
                  {pickerLoading ? "Opening Drive..." : "Select From Google Drive"}
                </button>
              </div>
            </form>
          </section>

          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Variant Image Assignment</h3>

            {loading ? (
              <div style={emptyBoxStyle}>Loading variants...</div>
            ) : variants.length === 0 ? (
              <div style={emptyBoxStyle}>No variants found for this product.</div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {variants.map((variant) => {
                  const variantId = String(variant.id || "");
                  return (
                    <div key={variantId} style={variantCardStyle}>
                      <div>
                        <div style={variantTitleStyle}>
                          {buildVariantLabel(variant)}
                        </div>
                        <div style={variantMetaStyle}>
                          SKU: {String(variant.sku || "-")}
                        </div>
                      </div>

                      <select
                        value={String(variant.image_id || "")}
                        onChange={(e) =>
                          handleAssignVariantImage(variant, e.target.value)
                        }
                        style={selectStyle}
                        disabled={savingVariantId === variantId}
                      >
                        <option value="">No image</option>
                        {imageOptions.map((image) => (
                          <option key={image.id} value={image.id}>
                            {image.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section style={{ ...cardStyle, marginTop: 24 }}>
          <h3 style={sectionTitleStyle}>Image Library</h3>

          {loading ? (
            <div style={emptyBoxStyle}>Loading images...</div>
          ) : images.length === 0 ? (
            <div style={emptyBoxStyle}>No images added yet.</div>
          ) : (
            <div style={imageGridStyle}>
              {images.map((image) => {
                const imageId = String(image.id || "");
                const isSaving = savingImageId === imageId;
                const isMain =
                  String(image.is_main || "").trim().toLowerCase() === "true";

                return (
                  <div key={imageId} style={imageCardStyle}>
                    <div style={previewWrapStyle}>
                      <img
                        src={String(image.image_url || "")}
                        alt={String(image.alt_text || "Product image")}
                        style={previewImageStyle}
                      />
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={metaStyle}>
                        <strong>ID:</strong> {imageId}
                      </div>

                      <div style={metaStyle}>
                        <strong>URL:</strong> {String(image.image_url || "-")}
                      </div>

                      <label style={fieldStyle}>
                        <span style={labelStyle}>Alt Text</span>
                        <input
                          type="text"
                          value={String(image.alt_text || "")}
                          onChange={(e) => {
                            const value = e.target.value;
                            setImages((prev) =>
                              prev.map((item) =>
                                String(item.id || "") === imageId
                                  ? { ...item, alt_text: value }
                                  : item
                              )
                            );
                          }}
                          style={inputStyle}
                        />
                      </label>

                      <div style={inlineGridStyle}>
                        <label style={fieldStyle}>
                          <span style={labelStyle}>Sort Order</span>
                          <input
                            type="number"
                            value={String(image.sort_order || "999")}
                            onChange={(e) => {
                              const value = e.target.value;
                              setImages((prev) =>
                                prev.map((item) =>
                                  String(item.id || "") === imageId
                                    ? { ...item, sort_order: value }
                                    : item
                                )
                              );
                            }}
                            style={inputStyle}
                          />
                        </label>

                        <label style={checkboxStyle}>
                          <input
                            type="checkbox"
                            checked={isMain}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setImages((prev) =>
                                prev.map((item) =>
                                  String(item.id || "") === imageId
                                    ? {
                                        ...item,
                                        is_main: checked ? "true" : "false",
                                      }
                                    : item
                                )
                              );
                            }}
                          />
                          <span>Main image</span>
                        </label>
                      </div>

                      <div style={actionRowStyle}>
                        <button
                          type="button"
                          style={primaryButtonStyle}
                          disabled={isSaving}
                          onClick={() => handleSaveImage(image)}
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>

                        <button
                          type="button"
                          style={dangerButtonStyle}
                          disabled={isSaving}
                          onClick={() => handleDeleteImage(imageId)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

const wrapperStyle: React.CSSProperties = {
  marginTop: 36,
  paddingTop: 28,
  borderTop: "1px solid #e8dfd3",
};

const headerStyle: React.CSSProperties = {
  marginBottom: 20,
};

const kickerStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7b7367",
  fontWeight: 800,
  marginBottom: 8,
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 28,
  lineHeight: 1.1,
  fontWeight: 900,
  color: "#171717",
};

const descriptionStyle: React.CSSProperties = {
  margin: 0,
  color: "#5d554a",
  lineHeight: 1.7,
};

const topGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e7ded1",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: "#171717",
  margin: "0 0 18px",
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#5d554a",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  borderRadius: 14,
  border: "1px solid #ddd3c5",
  padding: "0 14px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
};

const fileInputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 56,
  borderRadius: 14,
  border: "1px solid #ddd3c5",
  padding: "12px 14px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
};

const selectedFileStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  background: "#f7f3ed",
  border: "1px solid #e4dacb",
  color: "#4e473d",
  fontSize: 13,
  fontWeight: 700,
};

const selectStyle: React.CSSProperties = {
  minHeight: 48,
  minWidth: 250,
  borderRadius: 14,
  border: "1px solid #ddd3c5",
  padding: "0 14px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
};

const inlineGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
  alignItems: "end",
};

const checkboxStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minHeight: 48,
  fontWeight: 700,
  color: "#171717",
};

const buttonStackStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 48,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  padding: "0 18px",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 48,
  borderRadius: 999,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
  padding: "0 18px",
};

const dangerButtonStyle: React.CSSProperties = {
  minHeight: 48,
  borderRadius: 999,
  border: "1px solid #c94141",
  background: "#fff5f5",
  color: "#a61e1e",
  fontWeight: 800,
  cursor: "pointer",
  padding: "0 18px",
};

const successBoxStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 14,
  borderRadius: 16,
  background: "#eef8f0",
  border: "1px solid #cfe5d4",
  color: "#245843",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 14,
  borderRadius: 16,
  background: "#fff3f3",
  border: "1px solid #efcaca",
  color: "#8b1e1e",
  fontWeight: 700,
};

const emptyBoxStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#faf7f1",
  border: "1px solid #e8dece",
  color: "#5d554a",
};

const variantCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  border: "1px solid #ece2d4",
  borderRadius: 18,
  padding: 14,
  background: "#faf8f4",
};

const variantTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#171717",
  marginBottom: 4,
  fontSize: 18,
};

const variantMetaStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#756d61",
};

const imageGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 18,
};

const imageCardStyle: React.CSSProperties = {
  border: "1px solid #e8dece",
  borderRadius: 22,
  padding: 16,
  background: "#fff",
  display: "grid",
  gap: 14,
};

const previewWrapStyle: React.CSSProperties = {
  borderRadius: 18,
  overflow: "hidden",
  background: "#f7f3ed",
  border: "1px solid #ece2d4",
};

const previewImageStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  display: "block",
};

const metaStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#5d554a",
  wordBreak: "break-word",
};

const actionRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};