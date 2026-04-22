"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type BulkEditorColumnOption = {
  label: string;
  value: string;
};

type BulkEditorColumn = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "boolean" | "readonly";
  editable: boolean;
  visibleByDefault: boolean;
  width?: number;
  placeholder?: string;
  options?: BulkEditorColumnOption[];
};

type BulkEditorResponse = {
  ok: boolean;
  entity: string;
  title: string;
  description: string;
  sheetName: string;
  keyField: string;
  columns: BulkEditorColumn[];
  defaultVisibleColumnKeys: string[];
  editableColumnKeys: string[];
  page: number;
  total: number;
  totalPages: number;
  limit: number;
  items: Array<Record<string, string>>;
  error?: string;
};

type SaveResponse = {
  ok: boolean;
  summary?: {
    total: number;
    successCount: number;
    failedCount: number;
  };
  results?: Array<{
    fieldValue: string;
    ok: boolean;
    error?: string;
  }>;
  error?: string;
};

type Props = {
  entity: string;
  backHref: string;
  newHref?: string;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function buildDirtyKey(rowId: string, columnKey: string): string {
  return `${rowId}::${columnKey}`;
}

export default function BulkSpreadsheetEditor({
  entity,
  backHref,
  newHref,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keyField, setKeyField] = useState("");
  const [columns, setColumns] = useState<BulkEditorColumn[]>([]);
  const [items, setItems] = useState<Array<Record<string, string>>>([]);
  const [originalItems, setOriginalItems] = useState<Array<Record<string, string>>>([]);

  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>([]);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [dirtyMap, setDirtyMap] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "100");

      if (searchInput.trim()) {
        params.set("q", searchInput.trim());
      }

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await fetch(`/api/admin/bulk/${entity}?${params.toString()}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as BulkEditorResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load bulk editor data.");
      }

      setTitle(data.title);
      setDescription(data.description);
      setKeyField(data.keyField);
      setColumns(data.columns);
      setItems(data.items || []);
      setOriginalItems(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);

      setVisibleColumnKeys((prev) => {
        if (prev.length) {
          return prev;
        }

        return data.defaultVisibleColumnKeys || [];
      });

      setDirtyMap({});
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown loading error."
      );
    } finally {
      setLoading(false);
    }
  }, [entity, page, searchInput, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleColumns = useMemo(() => {
    return columns.filter((column) => visibleColumnKeys.includes(column.key));
  }, [columns, visibleColumnKeys]);

  const statusColumn = useMemo(() => {
    return columns.find((column) => column.key === "status");
  }, [columns]);

  const dirtyCellCount = useMemo(() => {
    return Object.keys(dirtyMap).length;
  }, [dirtyMap]);

  const dirtyRowCount = useMemo(() => {
    const rowIds = new Set(
      Object.keys(dirtyMap).map((key) => key.split("::")[0]).filter(Boolean)
    );
    return rowIds.size;
  }, [dirtyMap]);

  function handleToggleColumn(columnKey: string) {
    setVisibleColumnKeys((prev) => {
      if (prev.includes(columnKey)) {
        if (prev.length === 1) {
          return prev;
        }

        return prev.filter((key) => key !== columnKey);
      }

      return [...prev, columnKey];
    });
  }

  function handleCellChange(rowId: string, columnKey: string, nextValue: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (normalizeText(item[keyField]) !== rowId) {
          return item;
        }

        return {
          ...item,
          [columnKey]: nextValue,
        };
      })
    );

    const originalRow = originalItems.find(
      (item) => normalizeText(item[keyField]) === rowId
    );
    const originalValue = normalizeText(originalRow?.[columnKey]);
    const normalizedNextValue = normalizeText(nextValue);
    const dirtyKey = buildDirtyKey(rowId, columnKey);

    setDirtyMap((prev) => {
      const next = { ...prev };

      if (normalizedNextValue === originalValue) {
        delete next[dirtyKey];
        return next;
      }

      next[dirtyKey] = normalizedNextValue;
      return next;
    });
  }

  function handleResetAll() {
    setItems(originalItems);
    setDirtyMap({});
    setSuccessMessage("");
    setErrorMessage("");
  }

  async function handleSave() {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!dirtyCellCount) {
        throw new Error("There are no pending cell changes to save.");
      }

      const patchMap: Record<string, Record<string, string>> = {};

      Object.entries(dirtyMap).forEach(([compositeKey, value]) => {
        const [rowId, columnKey] = compositeKey.split("::");

        if (!rowId || !columnKey) {
          return;
        }

        if (!patchMap[rowId]) {
          patchMap[rowId] = {};
        }

        patchMap[rowId][columnKey] = value;
      });

      const patches = Object.entries(patchMap).map(([id, changes]) => ({
        id,
        changes,
      }));

      const response = await fetch(`/api/admin/bulk/${entity}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patches,
        }),
      });

      const data = (await response.json()) as SaveResponse;

      if (!response.ok && response.status !== 207) {
        throw new Error(data.error || "Failed to save bulk changes.");
      }

      if (!data.summary) {
        throw new Error("Bulk save summary is missing.");
      }

      setSuccessMessage(
        `Saved ${data.summary.successCount} row(s). Failed: ${data.summary.failedCount}.`
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown save error."
      );
    } finally {
      setSaving(false);
    }
  }

  function renderInput(
    rowId: string,
    item: Record<string, string>,
    column: BulkEditorColumn
  ) {
    const value = normalizeText(item[column.key]);
    const dirtyKey = buildDirtyKey(rowId, column.key);
    const isDirty = dirtyKey in dirtyMap;

    const commonStyle: React.CSSProperties = {
      width: "100%",
      minHeight: 38,
      border: isDirty ? "1px solid #2f7d62" : "1px solid #ddd6ca",
      background: isDirty ? "#f3fbf7" : "#fff",
      borderRadius: 10,
      padding: "8px 10px",
      outline: "none",
      fontSize: 13,
      color: "#171717",
    };

    if (!column.editable || column.type === "readonly") {
      return (
        <div style={readOnlyCellStyle}>
          {value || "-"}
        </div>
      );
    }

    if (column.type === "select" || column.type === "boolean") {
      return (
        <select
          value={value}
          onChange={(e) => handleCellChange(rowId, column.key, e.target.value)}
          style={commonStyle}
        >
          <option value="">-</option>
          {(column.options || []).map((option) => (
            <option key={`${column.key}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (column.type === "textarea") {
      return (
        <textarea
          value={value}
          onChange={(e) => handleCellChange(rowId, column.key, e.target.value)}
          placeholder={column.placeholder || ""}
          style={{
            ...commonStyle,
            minHeight: 76,
            resize: "vertical",
            lineHeight: 1.5,
          }}
        />
      );
    }

    return (
      <input
        value={value}
        onChange={(e) => handleCellChange(rowId, column.key, e.target.value)}
        placeholder={column.placeholder || ""}
        style={commonStyle}
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>{title || "Bulk Editor"}</h1>
          <p style={subtitleStyle}>
            {description}
          </p>
        </div>

        <div style={headerActionsStyle}>
          <Link href={backHref} style={secondaryButtonStyle}>
            Back to List
          </Link>

          {newHref ? (
            <Link href={newHref} style={secondaryButtonStyle}>
              + New Record
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => setShowColumnPicker((prev) => !prev)}
            style={secondaryButtonStyle}
          >
            {showColumnPicker ? "Hide Columns" : "Choose Columns"}
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            disabled={!dirtyCellCount || saving}
            style={!dirtyCellCount || saving ? disabledButtonStyle : secondaryButtonStyle}
          >
            Reset Changes
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!dirtyCellCount || saving}
            style={!dirtyCellCount || saving ? disabledButtonStyle : primaryButtonStyle}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div style={summaryCardStyle}>
        <div style={statsRowStyle}>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Total Records</div>
            <div style={statValueStyle}>{total}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Current Page</div>
            <div style={statValueStyle}>{items.length}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Dirty Rows</div>
            <div style={statValueStyle}>{dirtyRowCount}</div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>Dirty Cells</div>
            <div style={warningStatValueStyle}>{dirtyCellCount}</div>
          </div>
        </div>

        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Search</label>
            <input
              value={searchInput}
              onChange={(e) => {
                setPage(1);
                setSearchInput(e.target.value);
              }}
              placeholder="Search any visible record data"
              style={inputStyle}
            />
          </div>

          {statusColumn ? (
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
                style={inputStyle}
              >
                <option value="all">all</option>
                {(statusColumn.options || []).map((option) => (
                  <option key={`status-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {showColumnPicker ? (
          <div style={columnPickerWrapStyle}>
            {columns.map((column) => (
              <label key={column.key} style={columnCheckboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={visibleColumnKeys.includes(column.key)}
                  onChange={() => handleToggleColumn(column.key)}
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
        ) : null}

        {successMessage ? (
          <div style={successBoxStyle}>{successMessage}</div>
        ) : null}

        {errorMessage ? (
          <div style={errorBoxStyle}>{errorMessage}</div>
        ) : null}
      </div>

      {loading ? (
        <div style={emptyBoxStyle}>Loading bulk editor...</div>
      ) : !items.length ? (
        <div style={emptyBoxStyle}>No records found for the current filters.</div>
      ) : (
        <div style={tableWrapStyle}>
          <div style={tableScrollStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {visibleColumns.map((column) => (
                    <th
                      key={column.key}
                      style={{
                        ...thStyle,
                        minWidth: column.width || 180,
                        width: column.width || 180,
                      }}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {items.map((item, rowIndex) => {
                  const rowId = normalizeText(item[keyField]);

                  return (
                    <tr key={rowId || `row-${rowIndex}`}>
                      {visibleColumns.map((column) => (
                        <td
                          key={`${rowId}-${column.key}`}
                          style={{
                            ...tdStyle,
                            minWidth: column.width || 180,
                            width: column.width || 180,
                          }}
                        >
                          {renderInput(rowId, item, column)}
                        </td>
                      ))}
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
              disabled={page <= 1 || loading || saving}
              style={page <= 1 || loading || saving ? disabledButtonStyle : secondaryButtonStyle}
            >
              Previous
            </button>

            <div style={paginationInfoStyle}>
              Page {page} / {totalPages}
            </div>

            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading || saving}
              style={page >= totalPages || loading || saving ? disabledButtonStyle : secondaryButtonStyle}
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
  maxWidth: 820,
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const summaryCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
  display: "grid",
  gap: 18,
};

const statsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
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

const columnPickerWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  padding: 16,
  borderRadius: 16,
  border: "1px solid #e6ddd1",
  background: "#faf8f4",
};

const columnCheckboxLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 38,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid #ddd3c5",
  background: "#fff",
  fontSize: 14,
  fontWeight: 700,
};

const tableWrapStyle: React.CSSProperties = {
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
  padding: "16px 14px",
  fontSize: 12,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#7d7266",
  background: "#f8f5ef",
  borderBottom: "1px solid #e5dccf",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #efe8dc",
  verticalAlign: "top",
};

const readOnlyCellStyle: React.CSSProperties = {
  minHeight: 38,
  display: "flex",
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #ebe3d7",
  background: "#f8f5ef",
  color: "#5f564b",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.5,
};

const successBoxStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 700,
};

const emptyBoxStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
  color: "#6f6559",
  fontWeight: 700,
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

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 12,
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
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};

const disabledButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid #d8d8d8",
  background: "#f3f3f3",
  color: "#8a8a8a",
  fontWeight: 800,
  cursor: "not-allowed",
  textDecoration: "none",
};