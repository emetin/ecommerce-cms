"use client";

import { useState } from "react";

type CleanupFile = {
  entity_type: string;
  folder_id: string;
  file_id: string;
  file_name: string;
  created_time?: string;
  web_view_link?: string;
};

type CleanupResponse = {
  ok: boolean;
  error?: string;
  delete_orphans?: boolean;
  referenced_file_count?: number;
  scanned_file_count?: number;
  orphan_file_count?: number;
  deleted_file_count?: number;
  orphan_files?: CleanupFile[];
  deleted_file_ids?: string[];
};

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export default function AdminMediaCleanupPage() {
  const [loading, setLoading] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<CleanupResponse | null>(null);

  async function runCleanup() {
    try {
      setLoading(true);
      setErrorMessage("");
      setResult(null);

      const response = await fetch("/api/admin/media/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          delete_orphans: deleteMode ? "true" : "false",
        }),
      });

      const data = (await parseJsonSafe(response)) as CleanupResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Media cleanup request failed.");
      }

      setResult(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unknown error while running media cleanup."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={eyebrowStyle}>Admin Media Tools</div>

        <h1 style={titleStyle}>Media Cleanup</h1>

        <p style={subtitleStyle}>
          Scan managed Google Drive media folders, compare files with Google
          Sheets references, and detect orphaned media files that are no longer
          connected to products, collections, blog posts, product images, or
          media records.
        </p>
      </div>

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Cleanup Action</h2>

            <p style={sectionTextStyle}>
              First run the scanner without deleting files. After reviewing the
              orphan list, enable delete mode only when you are sure the files
              can be removed safely.
            </p>
          </div>

          <span style={badgeStyle}>
            {deleteMode ? "Delete Mode" : "Scan Only"}
          </span>
        </div>

        <label style={toggleRowStyle}>
          <input
            type="checkbox"
            checked={deleteMode}
            onChange={(event) => setDeleteMode(event.target.checked)}
          />

          <span>
            Delete orphan files from Google Drive after scanning. Use carefully.
          </span>
        </label>

        <div style={actionRowStyle}>
          <button
            type="button"
            onClick={runCleanup}
            disabled={loading}
            style={{
              ...primaryButtonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "Running Cleanup..."
              : deleteMode
              ? "Scan and Delete Orphans"
              : "Scan Orphan Media"}
          </button>
        </div>

        {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}
      </section>

      {result ? (
        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Cleanup Result</h2>

              <p style={sectionTextStyle}>
                The scan completed successfully. Review the summary and orphan
                file list below.
              </p>
            </div>

            <span style={successBadgeStyle}>Completed</span>
          </div>

          <div style={summaryGridStyle}>
            <SummaryCard
              label="Referenced Files"
              value={String(result.referenced_file_count || 0)}
            />

            <SummaryCard
              label="Scanned Files"
              value={String(result.scanned_file_count || 0)}
            />

            <SummaryCard
              label="Orphan Files"
              value={String(result.orphan_file_count || 0)}
            />

            <SummaryCard
              label="Deleted Files"
              value={String(result.deleted_file_count || 0)}
            />
          </div>

          <div style={noticeStyle}>
            <strong>Mode:</strong>{" "}
            {result.delete_orphans
              ? "Delete mode was active. Orphan files were deleted where possible."
              : "Scan only mode was active. No files were deleted."}
          </div>

          <div style={tableWrapStyle}>
            <div style={tableHeaderStyle}>
              <div>Entity</div>
              <div>File Name</div>
              <div>File ID</div>
              <div>Created</div>
              <div>Link</div>
            </div>

            {!result.orphan_files?.length ? (
              <div style={emptyStateStyle}>No orphan files found.</div>
            ) : (
              result.orphan_files.map((file) => (
                <div key={file.file_id} style={tableRowStyle}>
                  <div style={cellStrongStyle}>{file.entity_type || "-"}</div>

                  <div>{file.file_name || "-"}</div>

                  <div style={fileIdStyle}>{file.file_id || "-"}</div>

                  <div>{formatDate(file.created_time)}</div>

                  <div>
                    {file.web_view_link ? (
                      <a
                        href={file.web_view_link}
                        target="_blank"
                        rel="noreferrer"
                        style={linkStyle}
                      >
                        Open
                      </a>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryCardStyle}>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value}</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "grid",
  gap: 20,
};

const headerStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const eyebrowStyle: React.CSSProperties = {
  width: "fit-content",
  padding: "7px 12px",
  borderRadius: 999,
  background: "#f8f5ef",
  border: "1px solid #ece3d7",
  color: "#6b6256",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 34,
  lineHeight: 1.1,
  fontWeight: 850,
  color: "#171717",
  letterSpacing: "-0.03em",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#6f6559",
  fontSize: 14,
  lineHeight: 1.7,
  maxWidth: 840,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e2d8cb",
  background: "#fff",
  borderRadius: 22,
  padding: 22,
  display: "grid",
  gap: 18,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 22,
  lineHeight: 1.2,
  fontWeight: 850,
};

const sectionTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#6f6559",
  fontSize: 14,
  lineHeight: 1.7,
  maxWidth: 780,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 999,
  background: "#fff7e8",
  border: "1px solid #ecd8ad",
  color: "#8a6418",
  fontSize: 13,
  fontWeight: 800,
};

const successBadgeStyle: React.CSSProperties = {
  ...badgeStyle,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
};

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 14,
  borderRadius: 16,
  border: "1px solid #eee5d9",
  background: "#fffaf4",
  color: "#5f554b",
  fontSize: 14,
  lineHeight: 1.6,
  fontWeight: 700,
};

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontSize: 14,
  fontWeight: 850,
};

const errorBoxStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #f1c7c7",
  background: "#fff4f4",
  color: "#9b2c2c",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.6,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
};

const summaryCardStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid #eee5d9",
  background: "#fffaf4",
};

const summaryLabelStyle: React.CSSProperties = {
  color: "#6f6559",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 8,
};

const summaryValueStyle: React.CSSProperties = {
  color: "#171717",
  fontSize: 26,
  fontWeight: 900,
  lineHeight: 1.1,
};

const noticeStyle: React.CSSProperties = {
  padding: "13px 14px",
  borderRadius: 16,
  border: "1px solid #eadbb5",
  background: "#fff8e7",
  color: "#6b5530",
  fontSize: 14,
  lineHeight: 1.7,
};

const tableWrapStyle: React.CSSProperties = {
  border: "1px solid #e2d8cb",
  borderRadius: 16,
  overflow: "hidden",
};

const tableHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.8fr 1.6fr 1.5fr 0.9fr 0.5fr",
  gap: 12,
  alignItems: "center",
  minHeight: 42,
  padding: "0 12px",
  background: "#f8f5ef",
  borderBottom: "1px solid #e2d8cb",
  color: "#6f6559",
  fontSize: 12,
  fontWeight: 850,
};

const tableRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.8fr 1.6fr 1.5fr 0.9fr 0.5fr",
  gap: 12,
  alignItems: "center",
  minHeight: 44,
  padding: "8px 12px",
  borderBottom: "1px solid #f0e7da",
  color: "#171717",
  fontSize: 13,
};

const emptyStateStyle: React.CSSProperties = {
  padding: 18,
  color: "#756b60",
  fontWeight: 700,
};

const cellStrongStyle: React.CSSProperties = {
  color: "#171717",
  fontWeight: 850,
  textTransform: "capitalize",
};

const fileIdStyle: React.CSSProperties = {
  color: "#756b60",
  fontSize: 12,
  wordBreak: "break-all",
};

const linkStyle: React.CSSProperties = {
  color: "#2f7d62",
  fontWeight: 850,
  textDecoration: "none",
};