"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type MediaItem = {
  id: string;
  file_name: string;
  file_id: string;
  image_url: string;
  preview_url?: string;
  mime_type: string;
  size_bytes: string;
  folder: string;
  alt_text: string;
  created_at: string;
};

type MediaResponse = {
  ok?: boolean;
  items?: MediaItem[];
  item?: MediaItem;
  error?: string;
};

type UploadQueueItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

function formatSize(size: string) {
  const bytes = Number(size || 0);

  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPreviewUrl(item: MediaItem) {
  return item.preview_url || item.image_url || "";
}

function getFileExtension(item: MediaItem) {
  const name = item.file_name || "";
  const parts = name.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1] : "";

  if (ext) return ext.toUpperCase();

  if (item.mime_type?.includes("/")) {
    return item.mime_type.split("/")[1].toUpperCase();
  }

  return "-";
}

function createQueueId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runInBatches<T>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<void>
) {
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    await Promise.all(batch.map((item) => handler(item)));
  }
}

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [folder, setFolder] = useState("product");
  const [altText, setAltText] = useState("");
  const [search, setSearch] = useState("");
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isQueueVisible, setIsQueueVisible] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasActiveUploads = queue.some(
    (item) => item.status === "queued" || item.status === "uploading"
  );

  async function loadMedia() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(`/api/media/list?t=${Date.now()}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as MediaResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load media.");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
      setSelectedIds([]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMedia();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) =>
      [
        item.file_name,
        item.folder,
        item.alt_text,
        item.image_url,
        item.mime_type,
        item.created_at,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  const allVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.includes(item.id));

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    );
  }

  function toggleSelectAllVisible() {
    const visibleIds = filteredItems.map((item) => item.id);

    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  }

  async function deleteMediaItemWithRetry(item: MediaItem, attempt = 1) {
    try {
      const response = await fetch("/api/media/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          file_id: item.file_id,
          image_url: item.image_url,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Delete failed.");
      }

      return true;
    } catch {
      if (attempt < 3) {
        await sleep(700 * attempt);
        return deleteMediaItemWithRetry(item, attempt + 1);
      }

      return false;
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.length} selected image(s)?`
    );

    if (!confirmed) return;

    try {
      setBulkDeleting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const selectedItems = items.filter((item) => selectedIds.includes(item.id));

      let deletedCount = 0;
      let failedCount = 0;

      await runInBatches(selectedItems, 3, async (item) => {
        const deleted = await deleteMediaItemWithRetry(item);

        if (deleted) {
          deletedCount += 1;
        } else {
          failedCount += 1;
        }
      });

      setSelectedIds([]);

      await sleep(1000);
      await loadMedia();

      if (deletedCount > 0) {
        setSuccessMessage(`${deletedCount} image(s) deleted successfully.`);
      }

      if (failedCount > 0) {
        setErrorMessage(
          `${failedCount} image(s) could not be deleted. Please try again.`
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Bulk delete failed."
      );
    } finally {
      setBulkDeleting(false);
    }
  }

  async function uploadSingleFile(
    queueId: string,
    file: File,
    selectedFolder: string,
    selectedAltText: string,
    attempt = 1
  ): Promise<MediaItem[]> {
    try {
      return await new Promise<MediaItem[]>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();

        formData.append("file", file);
        formData.append("folder", selectedFolder);
        formData.append("alt_text", selectedAltText);

        xhr.open("POST", "/api/media/upload");

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;

          const progress = Math.round((event.loaded / event.total) * 100);

          setQueue((prev) =>
            prev.map((item) =>
              item.id === queueId ? { ...item, progress } : item
            )
          );
        };

        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText || "{}") as MediaResponse;

            if (xhr.status < 200 || xhr.status >= 300 || !data.ok) {
              throw new Error(data.error || "Upload failed.");
            }

            const uploadedItems = Array.isArray(data.items)
              ? data.items
              : data.item
                ? [data.item]
                : [];

            setQueue((prev) =>
              prev.map((item) =>
                item.id === queueId
                  ? { ...item, progress: 100, status: "done" }
                  : item
              )
            );

            resolve(uploadedItems);
          } catch (error) {
            reject(error);
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during upload."));
        };

        xhr.send(formData);
      });
    } catch (error) {
      if (attempt < 3) {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === queueId
              ? {
                  ...item,
                  status: "uploading",
                  progress: 10,
                  error: `Retrying upload... (${attempt + 1}/3)`,
                }
              : item
          )
        );

        await sleep(1200);

        return uploadSingleFile(
          queueId,
          file,
          selectedFolder,
          selectedAltText,
          attempt + 1
        );
      }

      const message = error instanceof Error ? error.message : "Upload failed.";

      setQueue((prev) =>
        prev.map((item) =>
          item.id === queueId
            ? { ...item, status: "error", error: message }
            : item
        )
      );

      throw error;
    }
  }

  async function startUploadQueue(selectedFiles: File[]) {
    if (selectedFiles.length === 0) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsQueueVisible(true);

    const selectedFolder = folder.trim() || "product";
    const selectedAltText = altText.trim();

    const newQueueItems: UploadQueueItem[] = selectedFiles.map((file) => ({
      id: createQueueId(file),
      file,
      progress: 0,
      status: "queued",
    }));

    setQueue((prev) => [...newQueueItems, ...prev]);

    let totalUploaded = 0;
    let totalFailed = 0;

    await runInBatches(newQueueItems, 2, async (queueItem) => {
      try {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === queueItem.id
              ? { ...item, status: "uploading", progress: 3 }
              : item
          )
        );

        const uploadedItems = await uploadSingleFile(
          queueItem.id,
          queueItem.file,
          selectedFolder,
          selectedAltText
        );

        if (uploadedItems.length > 0) {
          totalUploaded += uploadedItems.length;
        }
      } catch {
        totalFailed += 1;
      }
    });

    await sleep(1200);
    await loadMedia();

    if (totalUploaded > 0) {
      setSuccessMessage(`${totalUploaded} image(s) uploaded successfully.`);
      setAltText("");
    }

    if (totalFailed > 0) {
      setErrorMessage(`${totalFailed} image(s) could not be uploaded.`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setTimeout(() => {
      setQueue((prev) => prev.filter((item) => item.status !== "done"));
    }, 3500);
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setSuccessMessage("Image URL copied.");
    } catch {
      setErrorMessage("Could not copy URL. Please copy it manually.");
    }
  }

  async function handleDelete(item: MediaItem) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this image from the Media Library?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      setErrorMessage("");
      setSuccessMessage("");

      const deleted = await deleteMediaItemWithRetry(item);

      if (!deleted) {
        throw new Error("Delete failed.");
      }

      await sleep(700);
      await loadMedia();

      setSuccessMessage("Image deleted successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div style={pageWrapStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Media Library</h1>
          <p style={subtitleStyle}>
            Select images and they will be uploaded automatically to the local
            media library.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <Link href="/admin/media/cleanup" style={secondaryLinkStyle}>
            Cleanup
          </Link>

          <button type="button" onClick={loadMedia} style={secondaryButtonStyle}>
            Refresh
          </button>
        </div>
      </div>

      <div style={uploadCardStyle}>
        <div style={formGridStyle}>
          <div>
            <label style={labelStyle}>Images</label>

            <label style={uploadDropStyle}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                multiple
                onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files || []);
                  startUploadQueue(selectedFiles);
                }}
                style={hiddenFileInputStyle}
              />

              <span style={uploadIconStyle}>+</span>

              <span style={uploadTextWrapStyle}>
                <strong style={uploadTitleStyle}>
                  {hasActiveUploads ? "Uploading images..." : "Choose images"}
                </strong>
                <span style={uploadHintStyle}>
                  JPG, PNG, WEBP or GIF. Multiple images supported.
                </span>
              </span>
            </label>
          </div>

          <div>
            <label style={labelStyle}>Folder Type</label>
            <select
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
              style={inputStyle}
            >
              <option value="product">Product</option>
              <option value="collection">Collection</option>
              <option value="blog">Blog</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Alt Text</label>
            <input
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              placeholder="Describe this image"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}
      {successMessage ? (
        <div style={successBoxStyle}>{successMessage}</div>
      ) : null}

      <div style={tableCardStyle}>
        <div style={toolbarStyle}>
          {selectedIds.length > 0 ? (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={dangerButtonStyle}
            >
              {bulkDeleting
                ? "Deleting..."
                : `Delete Selected (${selectedIds.length})`}
            </button>
          ) : null}

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files..."
            style={searchInputStyle}
          />

          <div style={countStyle}>
            {filteredItems.length} / {items.length}
          </div>
        </div>

        {loading ? (
          <div style={emptyStateStyle}>Loading media...</div>
        ) : filteredItems.length === 0 ? (
          <div style={emptyStateStyle}>No media found.</div>
        ) : (
          <div style={tableScrollStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={checkboxThStyle}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                    />
                  </th>
                  <th style={thStyle}>File name</th>
                  <th style={thStyle}>Alt text</th>
                  <th style={thStyle}>Date added</th>
                  <th style={thStyle}>Size</th>
                  <th style={thStyle}>Folder</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => {
                  const previewUrl = getPreviewUrl(item);

                  return (
                    <tr key={item.id} style={trStyle}>
                      <td style={checkboxTdStyle}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelected(item.id)}
                        />
                      </td>

                      <td style={tdStyle}>
                        <div style={fileCellStyle}>
                          <div style={thumbWrapStyle}>
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt={
                                  item.alt_text ||
                                  item.file_name ||
                                  "Media image"
                                }
                                style={thumbStyle}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div style={thumbEmptyStyle}>
                                {getFileExtension(item)}
                              </div>
                            )}
                          </div>

                          <div style={fileTextWrapStyle}>
                            <div style={fileNameStyle} title={item.file_name}>
                              {item.file_name || "-"}
                            </div>
                            <div style={fileTypeStyle}>
                              {getFileExtension(item)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <span style={mutedTextStyle}>
                          {item.alt_text || "-"}
                        </span>
                      </td>

                      <td style={tdStyle}>{formatDate(item.created_at)}</td>

                      <td style={tdStyle}>{formatSize(item.size_bytes)}</td>

                      <td style={tdStyle}>
                        <span style={folderBadgeStyle}>
                          {item.folder || "product"}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <div style={actionsStyle}>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.image_url)}
                            style={iconButtonStyle}
                          >
                            Copy URL
                          </button>

                          <a
                            href={item.image_url}
                            target="_blank"
                            rel="noreferrer"
                            style={iconLinkStyle}
                          >
                            Open
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id || bulkDeleting}
                            style={dangerButtonStyle}
                          >
                            {deletingId === item.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {queue.length > 0 && isQueueVisible ? (
        <div style={uploadToastStyle}>
          <div style={uploadToastHeaderStyle}>
            <strong>Upload Queue</strong>

            <div style={uploadToastActionsStyle}>
              <span>{queue.length}</span>

              <button
                type="button"
                onClick={() => setIsQueueVisible(false)}
                style={queueCloseButtonStyle}
                aria-label="Close upload queue"
              >
                ×
              </button>
            </div>
          </div>

          <div style={uploadQueueListStyle}>
            {queue.map((item) => (
              <div key={item.id} style={queueItemStyle}>
                <div style={queueItemTopStyle}>
                  <span style={queueFileNameStyle}>{item.file.name}</span>
                  <span style={queueStatusStyle}>
                    {item.status === "queued"
                      ? "Queued"
                      : item.status === "uploading"
                        ? `${item.progress}%`
                        : item.status === "done"
                          ? "Done"
                          : "Error"}
                  </span>
                </div>

                <div style={progressTrackStyle}>
                  <div
                    style={{
                      ...progressFillStyle,
                      width: `${item.progress}%`,
                      background:
                        item.status === "error" ? "#b84242" : "#2f7d62",
                    }}
                  />
                </div>

                {item.error ? (
                  <div style={queueErrorStyle}>{item.error}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const pageWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 22,
};

const pageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
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

const uploadCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 22,
  padding: 22,
  display: "grid",
  gap: 16,
  boxShadow: "0 8px 24px rgba(23,23,23,0.04)",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1fr",
  gap: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 800,
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 50,
  padding: "13px 15px",
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 14,
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 13,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryLinkStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const errorBoxStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 700,
};

const successBoxStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: "#edf8f1",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontWeight: 700,
};

const tableCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 22,
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(23,23,23,0.04)",
};

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 14,
  borderBottom: "1px solid #eee6da",
};

const searchInputStyle: React.CSSProperties = {
  marginLeft: "auto",
  width: 280,
  minHeight: 38,
  padding: "0 13px",
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#fff",
  outline: "none",
  fontSize: 14,
};

const countStyle: React.CSSProperties = {
  color: "#6f6559",
  fontWeight: 800,
  fontSize: 13,
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
  padding: "13px 16px",
  fontSize: 13,
  color: "#6f6559",
  background: "#faf8f4",
  borderBottom: "1px solid #eee6da",
  fontWeight: 800,
};

const checkboxThStyle: React.CSSProperties = {
  ...thStyle,
  width: 48,
  textAlign: "center",
};

const trStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee6da",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 16px",
  verticalAlign: "middle",
  fontSize: 14,
};

const checkboxTdStyle: React.CSSProperties = {
  ...tdStyle,
  width: 48,
  textAlign: "center",
};

const fileCellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 300,
};

const thumbWrapStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 10,
  overflow: "hidden",
  background: "#f8f5ef",
  border: "1px solid #e5dccf",
  flex: "0 0 auto",
};

const thumbStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const thumbEmptyStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  color: "#6f6559",
  fontSize: 10,
  fontWeight: 800,
};

const fileTextWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 3,
  minWidth: 0,
};

const fileNameStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#171717",
  maxWidth: 360,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const fileTypeStyle: React.CSSProperties = {
  color: "#6f6559",
  fontSize: 12,
  fontWeight: 700,
};

const mutedTextStyle: React.CSSProperties = {
  color: "#6f6559",
};

const folderBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#f8f5ef",
  border: "1px solid #e5dccf",
  color: "#5f564c",
  fontWeight: 800,
  fontSize: 12,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const iconButtonStyle: React.CSSProperties = {
  minHeight: 34,
  padding: "0 11px",
  borderRadius: 10,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
};

const iconLinkStyle: React.CSSProperties = {
  minHeight: 34,
  padding: "0 11px",
  borderRadius: 10,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const dangerButtonStyle: React.CSSProperties = {
  minHeight: 34,
  padding: "0 11px",
  borderRadius: 10,
  border: "1px solid #e5c9c9",
  background: "#fff5f5",
  color: "#8f2d2d",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
};

const emptyStateStyle: React.CSSProperties = {
  padding: 26,
  color: "#6f6559",
  fontWeight: 700,
};

const uploadDropStyle: React.CSSProperties = {
  minHeight: 58,
  borderRadius: 16,
  border: "1px dashed #cdbfad",
  background: "#fcfbf8",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  cursor: "pointer",
};

const hiddenFileInputStyle: React.CSSProperties = {
  display: "none",
};

const uploadIconStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#2f7d62",
  color: "#fff",
  fontWeight: 900,
  fontSize: 22,
  lineHeight: 1,
  flexShrink: 0,
};

const uploadTextWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 3,
};

const uploadTitleStyle: React.CSSProperties = {
  color: "#171717",
  fontSize: 14,
};

const uploadHintStyle: React.CSSProperties = {
  color: "#6f6559",
  fontSize: 12,
  fontWeight: 700,
};

const uploadToastStyle: React.CSSProperties = {
  position: "fixed",
  right: 24,
  bottom: 24,
  width: 360,
  maxWidth: "calc(100vw - 48px)",
  maxHeight: 430,
  overflow: "hidden",
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 18,
  boxShadow: "0 18px 50px rgba(0,0,0,0.16)",
  zIndex: 50,
};

const uploadToastHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "14px 16px",
  borderBottom: "1px solid #eee6da",
};

const uploadToastActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#6f6559",
  fontWeight: 800,
  fontSize: 13,
};

const queueCloseButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  cursor: "pointer",
  fontSize: 20,
  lineHeight: 1,
};

const uploadQueueListStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 14,
  maxHeight: 360,
  overflowY: "auto",
};

const queueItemStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  border: "1px solid #eee6da",
  borderRadius: 12,
  padding: 10,
  background: "#fcfbf8",
};

const queueItemTopStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const queueFileNameStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "#171717",
  fontWeight: 800,
  fontSize: 12,
};

const queueStatusStyle: React.CSSProperties = {
  color: "#6f6559",
  fontWeight: 800,
  fontSize: 12,
  flexShrink: 0,
};

const progressTrackStyle: React.CSSProperties = {
  height: 7,
  borderRadius: 999,
  background: "#e8dfd4",
  overflow: "hidden",
};

const progressFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  transition: "width 0.2s ease",
};

const queueErrorStyle: React.CSSProperties = {
  color: "#8d2f2f",
  fontWeight: 700,
  fontSize: 12,
};