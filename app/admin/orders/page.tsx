"use client";

import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id: string;
  order_number: string;
  cart_id?: string;
  customer_id: string;

  email?: string;
  first_name?: string;
  last_name?: string;
  company_name: string;
  phone?: string;

  country?: string;
  city?: string;
  address_line_1?: string;
  address_line_2?: string;
  postal_code?: string;

  status: string;
  currency: string;

  subtotal: number;
  discount_total?: number;
  shipping_total?: number;
  tax_total?: number;
  grand_total?: number;
  item_count?: number;

  notes: string;
  created_at: string;
  updated_at: string;
};

type OrderLineItem = {
  id: string;
  order_id: string;
  product_slug: string;
  variant_id: string;
  sku: string;
  product_title: string;
  variant_label: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
};

type ApiListResponse = {
  ok?: boolean;
  error?: string;
  total?: number;
  items?: OrderItem[];
};

type ApiOrderItemsResponse = {
  ok?: boolean;
  error?: string;
  items?: OrderLineItem[];
};

type ApiStatusResponse = {
  ok?: boolean;
  error?: string;
  order?: {
    orderNumber?: string;
  };
};

const STATUS_OPTIONS = [
  "submitted",
  "reviewing",
  "quoted",
  "approved",
  "processing",
  "completed",
  "cancelled",
  "paid",
];

const EXPORT_FORMAT_OPTIONS = ["csv", "json", "xml"];

function normalizeText(value?: string) {
  return String(value || "").trim();
}

function normalizeLower(value?: string) {
  return normalizeText(value).toLowerCase();
}

function getContactName(item: OrderItem) {
  return [item.first_name, item.last_name].filter(Boolean).join(" ").trim();
}

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function getStatusStyle(value?: string): React.CSSProperties {
  const raw = normalizeLower(value);

  if (raw === "completed" || raw === "paid") {
    return {
      background: "#eef8f0",
      color: "#2f7d62",
      border: "1px solid rgba(47,125,98,0.18)",
    };
  }

  if (raw === "processing" || raw === "approved" || raw === "quoted") {
    return {
      background: "#eef4fb",
      color: "#315f95",
      border: "1px solid rgba(49,95,149,0.16)",
    };
  }

  if (raw === "reviewing" || raw === "submitted") {
    return {
      background: "#fff7e8",
      color: "#8a6418",
      border: "1px solid rgba(138,100,24,0.18)",
    };
  }

  if (raw === "cancelled") {
    return {
      background: "#fff4f2",
      color: "#a54a3f",
      border: "1px solid rgba(165,74,63,0.18)",
    };
  }

  return {
    background: "#f8f5ef",
    color: "#6a6156",
    border: "1px solid #e5ddd2",
  };
}

async function readJsonResponse<T>(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (!contentType.includes("application/json")) {
    const shortText = rawText.slice(0, 160).replace(/\s+/g, " ").trim();

    throw new Error(
      `${fallbackMessage} API returned non-JSON response. Status: ${response.status}. Preview: ${shortText}`
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error(`${fallbackMessage} Invalid JSON response.`);
  }
}

export default function AdminOrdersPage() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [orderItemsMap, setOrderItemsMap] = useState<
    Record<string, OrderLineItem[]>
  >({});
  const [itemsLoadingId, setItemsLoadingId] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  async function loadOrders() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/admin/orders/list", {
        cache: "no-store",
      });

      const data = await readJsonResponse<ApiListResponse>(
        response,
        "Failed to load quote requests."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load quote requests.");
      }

      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);

      const nextStatusMap: Record<string, string> = {};

      nextItems.forEach((item) => {
        nextStatusMap[item.id] = item.status || "submitted";
      });

      setStatusMap(nextStatusMap);
    } catch (error) {
      setItems([]);
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredItems = useMemo(() => {
    const query = normalizeLower(searchInput);

    return items.filter((item) => {
      const contactName = getContactName(item);

      const matchesSearch =
        !query ||
        normalizeLower(item.order_number).includes(query) ||
        normalizeLower(item.company_name).includes(query) ||
        normalizeLower(contactName).includes(query) ||
        normalizeLower(item.customer_id).includes(query) ||
        normalizeLower(item.email).includes(query) ||
        normalizeLower(item.phone).includes(query) ||
        normalizeLower(item.city).includes(query) ||
        normalizeLower(item.country).includes(query) ||
        normalizeLower(item.status).includes(query) ||
        normalizeLower(item.notes).includes(query);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : normalizeLower(item.status) === normalizeLower(statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [items, searchInput, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      submitted: items.filter(
        (item) => normalizeLower(item.status) === "submitted"
      ).length,
      reviewing: items.filter(
        (item) => normalizeLower(item.status) === "reviewing"
      ).length,
      quoted: items.filter((item) => normalizeLower(item.status) === "quoted")
        .length,
      approved: items.filter(
        (item) => normalizeLower(item.status) === "approved"
      ).length,
      processing: items.filter(
        (item) => normalizeLower(item.status) === "processing"
      ).length,
      completed: items.filter(
        (item) => normalizeLower(item.status) === "completed"
      ).length,
      cancelled: items.filter(
        (item) => normalizeLower(item.status) === "cancelled"
      ).length,
      paid: items.filter((item) => normalizeLower(item.status) === "paid")
        .length,
    };
  }, [items]);

  async function handleUpdateStatus(orderId: string) {
    try {
      setSavingId(orderId);
      setSuccessMessage("");
      setErrorMessage("");

      const response = await fetch("/api/admin/orders/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          status: statusMap[orderId] || "submitted",
        }),
      });

      const data = await readJsonResponse<ApiStatusResponse>(
        response,
        "Failed to update quote request status."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to update quote request status.");
      }

      setSuccessMessage(
        `Quote request ${data.order?.orderNumber || ""} updated successfully.`
      );

      await loadOrders();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setSavingId("");
    }
  }

  async function loadOrderItems(orderId: string) {
    try {
      setItemsLoadingId(orderId);
      setErrorMessage("");

      const response = await fetch(
        `/api/admin/orders/items?orderId=${encodeURIComponent(orderId)}`,
        { cache: "no-store" }
      );

      const data = await readJsonResponse<ApiOrderItemsResponse>(
        response,
        "Failed to load quote request items."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load quote request items.");
      }

      setOrderItemsMap((prev) => ({
        ...prev,
        [orderId]: Array.isArray(data.items) ? data.items : [],
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setItemsLoadingId("");
    }
  }

  async function handleToggleItems(orderId: string) {
    if (expandedOrderId === orderId) {
      setExpandedOrderId("");
      return;
    }

    setExpandedOrderId(orderId);

    if (!orderItemsMap[orderId]) {
      await loadOrderItems(orderId);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Quote Requests</h1>
          <p style={subtitleStyle}>
            Review submitted B2B quote requests, inspect buyer contact details,
            open line items, and update the sales review status.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <div style={exportMenuWrapStyle}>
            <button
              type="button"
              onClick={() => setExportMenuOpen((previous) => !previous)}
              style={exportDropdownButtonStyle}
            >
              Export
              <span style={exportChevronStyle}>▾</span>
            </button>

            {exportMenuOpen ? (
              <div style={exportDropdownMenuStyle}>
                {EXPORT_FORMAT_OPTIONS.map((format) => (
                  <a
                    key={format}
                    href={`/api/admin/orders/export?format=${format}`}
                    style={exportDropdownItemStyle}
                    onClick={() => setExportMenuOpen(false)}
                  >
                    {format.toUpperCase()}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section style={toolbarStyle}>
        <div style={statsBarStyle}>
          <Metric label="Total" value={stats.total} />
          <Metric label="Submitted" value={stats.submitted} warning />
          <Metric label="Reviewing" value={stats.reviewing} />
          <Metric label="Quoted" value={stats.quoted} />
          <Metric label="Approved" value={stats.approved} />
          <Metric label="Processing" value={stats.processing} />
          <Metric label="Completed" value={stats.completed} />
          <Metric label="Cancelled" value={stats.cancelled} warning />
          <Metric label="Paid" value={stats.paid} />
        </div>

        <div style={filterGridStyle}>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search quote number, company, email, phone, city, country, notes..."
            style={inputStyle}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={selectStyle}
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </section>

      {successMessage ? (
        <div style={successBoxStyle}>{successMessage}</div>
      ) : null}

      {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}

      <section style={tableWrapStyle}>
        <div style={tableHeaderStyle}>
          <div style={checkCellStyle}></div>
          <div>Request</div>
          <div>Buyer</div>
          <div>Location</div>
          <div>Total</div>
          <div>Status</div>
          <div>Created</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {loading ? (
          <div style={emptyStateStyle}>Loading quote requests...</div>
        ) : filteredItems.length === 0 ? (
          <div style={emptyStateStyle}>No quote requests matched your filters.</div>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedOrderId === item.id;
            const orderLines = orderItemsMap[item.id] || [];
            const contactName = getContactName(item);
            const grandTotal = Number(item.grand_total ?? item.subtotal ?? 0);

            return (
              <div key={item.id || item.order_number}>
                <div style={tableRowStyle}>
                  <div style={checkCellStyle}>
                    <input type="checkbox" />
                  </div>

                  <div>
                    <div style={orderNumberStyle}>
                      {item.order_number || "-"}
                    </div>

                    <div style={subTextStyle}>
                      {Number(item.item_count || 0)} items
                    </div>

                    {item.notes ? (
                      <div style={noteInlineStyle}>Note: {item.notes}</div>
                    ) : null}
                  </div>

                  <div>
                    <div style={cellStrongStyle}>
                      {item.company_name || "-"}
                    </div>

                    <div style={subTextStyle}>{contactName || "-"}</div>

                    <div style={subTextStyle}>{item.email || "-"}</div>

                    <div style={subTextStyle}>{item.phone || "-"}</div>
                  </div>

                  <div>
                    <div style={cellStrongStyle}>
                      {[item.city, item.country].filter(Boolean).join(", ") ||
                        "-"}
                    </div>

                    <div style={subTextStyle}>
                      {item.address_line_1 || "-"}
                    </div>

                    {item.postal_code ? (
                      <div style={subTextStyle}>{item.postal_code}</div>
                    ) : null}
                  </div>

                  <div>
                    <div style={cellStrongStyle}>
                      {formatMoney(grandTotal, item.currency)}
                    </div>
                    <div style={subTextStyle}>{item.currency || "USD"}</div>
                  </div>

                  <div>
                    <span
                      style={{
                        ...statusPillStyle,
                        ...getStatusStyle(item.status),
                      }}
                    >
                      {item.status || "submitted"}
                    </span>
                  </div>

                  <div>
                    <div>{formatDate(item.created_at)}</div>
                    <div style={subTextStyle}>
                      Updated: {formatDate(item.updated_at)}
                    </div>
                  </div>

                  <div style={rowActionsStyle}>
                    <select
                      value={statusMap[item.id] || item.status || "submitted"}
                      onChange={(event) =>
                        setStatusMap((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                      style={rowSelectStyle}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(item.id)}
                      disabled={savingId === item.id}
                      style={{
                        ...compactPrimaryButtonStyle,
                        opacity: savingId === item.id ? 0.7 : 1,
                        cursor:
                          savingId === item.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {savingId === item.id ? "Saving" : "Save"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleItems(item.id)}
                      style={compactButtonStyle}
                    >
                      {isExpanded ? "Hide" : "Items"}
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div style={expandedRowStyle}>
                    <div style={detailsGridStyle}>
                      <div style={detailCardStyle}>
                        <div style={detailTitleStyle}>Contact</div>
                        <div style={detailTextStyle}>
                          Company: {item.company_name || "-"}
                        </div>
                        <div style={detailTextStyle}>
                          Contact: {contactName || "-"}
                        </div>
                        <div style={detailTextStyle}>
                          Email: {item.email || "-"}
                        </div>
                        <div style={detailTextStyle}>
                          Phone: {item.phone || "-"}
                        </div>
                      </div>

                      <div style={detailCardStyle}>
                        <div style={detailTitleStyle}>Shipping</div>
                        <div style={detailTextStyle}>
                          Country: {item.country || "-"}
                        </div>
                        <div style={detailTextStyle}>City: {item.city || "-"}</div>
                        <div style={detailTextStyle}>
                          Address: {item.address_line_1 || "-"}
                        </div>
                        <div style={detailTextStyle}>
                          Postal Code: {item.postal_code || "-"}
                        </div>
                      </div>

                      <div style={detailCardStyle}>
                        <div style={detailTitleStyle}>Request Note</div>
                        <div style={detailTextStyle}>{item.notes || "-"}</div>
                      </div>
                    </div>

                    {itemsLoadingId === item.id ? (
                      <div style={lineEmptyStyle}>Loading quote items...</div>
                    ) : orderLines.length === 0 ? (
                      <div style={lineEmptyStyle}>
                        No line items found for this quote request.
                      </div>
                    ) : (
                      <div style={lineTableStyle}>
                        <div style={lineHeaderStyle}>
                          <div>Product</div>
                          <div>Variant</div>
                          <div>SKU</div>
                          <div>Qty</div>
                          <div>Unit</div>
                          <div>Total</div>
                        </div>

                        {orderLines.map((line) => (
                          <div key={line.id} style={lineRowStyle}>
                            <div>
                              <div style={cellStrongStyle}>
                                {line.product_title || "-"}
                              </div>
                              <div style={subTextStyle}>
                                {line.product_slug || "-"}
                              </div>
                            </div>

                            <div>{line.variant_label || "-"}</div>
                            <div>{line.sku || "-"}</div>
                            <div>{line.quantity}</div>
                            <div>
                              {formatMoney(line.unit_price, item.currency)}
                            </div>
                            <div style={cellStrongStyle}>
                              {formatMoney(line.line_total, item.currency)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div style={warning ? metricWarningStyle : metricStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const pageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 30,
  lineHeight: 1.1,
  fontWeight: 800,
  color: "#171717",
};

const subtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#6f6559",
  fontSize: 13,
  lineHeight: 1.5,
  maxWidth: 760,
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const exportMenuWrapStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-flex",
};

const exportDropdownButtonStyle: React.CSSProperties = {
  minHeight: 36,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 10,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};

const exportChevronStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#756b60",
  lineHeight: 1,
};

const exportDropdownMenuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  width: 150,
  background: "#fff",
  border: "1px solid #d8cebf",
  borderRadius: 12,
  boxShadow: "0 14px 34px rgba(23,23,23,0.12)",
  padding: 6,
  zIndex: 20,
};

const exportDropdownItemStyle: React.CSSProperties = {
  minHeight: 36,
  display: "flex",
  alignItems: "center",
  borderRadius: 8,
  padding: "0 10px",
  color: "#171717",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 800,
};

const toolbarStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 14,
  padding: 12,
  display: "grid",
  gap: 10,
};

const statsBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const metricStyle: React.CSSProperties = {
  minHeight: 34,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "0 10px",
  borderRadius: 999,
  border: "1px solid #e2d8cb",
  background: "#faf8f4",
  color: "#5f554b",
  fontSize: 12,
  fontWeight: 700,
};

const metricWarningStyle: React.CSSProperties = {
  ...metricStyle,
  background: "#fff7e8",
  border: "1px solid #ecd8ad",
  color: "#8a6418",
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 220px",
  gap: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 38,
  border: "1px solid #d8cebf",
  borderRadius: 10,
  background: "#fcfbf8",
  padding: "0 12px",
  outline: "none",
  fontSize: 13,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 38,
  border: "1px solid #d8cebf",
  borderRadius: 10,
  background: "#fcfbf8",
  padding: "0 10px",
  outline: "none",
  fontSize: 13,
};

const tableWrapStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 14,
  overflow: "hidden",
};

const tableHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "34px 1fr 1.45fr 1.1fr 0.75fr 0.75fr 0.8fr 1.7fr",
  gap: 10,
  alignItems: "center",
  minHeight: 40,
  padding: "0 12px",
  background: "#f8f5ef",
  borderBottom: "1px solid #e2d8cb",
  color: "#6f6559",
  fontSize: 12,
  fontWeight: 800,
};

const tableRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "34px 1fr 1.45fr 1.1fr 0.75fr 0.75fr 0.8fr 1.7fr",
  gap: 10,
  alignItems: "center",
  minHeight: 66,
  padding: "8px 12px",
  borderBottom: "1px solid #f0e7da",
  fontSize: 13,
  color: "#171717",
};

const checkCellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const orderNumberStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#171717",
};

const cellStrongStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#171717",
};

const subTextStyle: React.CSSProperties = {
  marginTop: 3,
  color: "#756b60",
  fontSize: 12,
  lineHeight: 1.35,
};

const noteInlineStyle: React.CSSProperties = {
  marginTop: 3,
  color: "#756b60",
  fontSize: 12,
  lineHeight: 1.35,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 220,
};

const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 24,
  padding: "0 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const rowActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 6,
};

const rowSelectStyle: React.CSSProperties = {
  width: 116,
  minHeight: 32,
  border: "1px solid #d8cebf",
  borderRadius: 8,
  background: "#fcfbf8",
  padding: "0 8px",
  outline: "none",
  fontSize: 12,
};

const compactButtonStyle: React.CSSProperties = {
  minHeight: 32,
  borderRadius: 8,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  padding: "0 10px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const compactPrimaryButtonStyle: React.CSSProperties = {
  ...compactButtonStyle,
  background: "#2f7d62",
  border: "1px solid #2f7d62",
  color: "#fff",
};

const expandedRowStyle: React.CSSProperties = {
  background: "#fcfbf8",
  borderBottom: "1px solid #f0e7da",
  padding: "12px 46px 14px",
  display: "grid",
  gap: 12,
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const detailCardStyle: React.CSSProperties = {
  border: "1px solid #e2d8cb",
  borderRadius: 12,
  background: "#fff",
  padding: 12,
  display: "grid",
  gap: 5,
};

const detailTitleStyle: React.CSSProperties = {
  color: "#171717",
  fontSize: 13,
  fontWeight: 900,
};

const detailTextStyle: React.CSSProperties = {
  color: "#5f554b",
  fontSize: 12,
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const lineTableStyle: React.CSSProperties = {
  border: "1px solid #e2d8cb",
  borderRadius: 12,
  overflow: "hidden",
  background: "#fff",
};

const lineHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.6fr 1fr 0.8fr 0.4fr 0.6fr 0.7fr",
  gap: 10,
  minHeight: 34,
  alignItems: "center",
  padding: "0 10px",
  background: "#f8f5ef",
  borderBottom: "1px solid #e2d8cb",
  fontSize: 12,
  fontWeight: 800,
  color: "#6f6559",
};

const lineRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.6fr 1fr 0.8fr 0.4fr 0.6fr 0.7fr",
  gap: 10,
  minHeight: 44,
  alignItems: "center",
  padding: "8px 10px",
  borderBottom: "1px solid #f0e7da",
  fontSize: 12,
};

const emptyStateStyle: React.CSSProperties = {
  padding: 18,
  color: "#756b60",
  fontWeight: 700,
};

const lineEmptyStyle: React.CSSProperties = {
  padding: 12,
  color: "#756b60",
  fontWeight: 700,
  fontSize: 13,
};

const successBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 700,
};