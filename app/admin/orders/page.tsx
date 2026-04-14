"use client";

import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id: string;
  order_number: string;
  customer_id: string;
  company_name: string;
  status: string;
  subtotal: number;
  currency: string;
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

const STATUS_OPTIONS = [
  "pending",
  "approved",
  "processing",
  "completed",
  "cancelled",
];

function normalizeText(value?: string) {
  return String(value || "").trim();
}

function normalizeLower(value?: string) {
  return normalizeText(value).toLowerCase();
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
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function getStatusStyle(value?: string): React.CSSProperties {
  const raw = normalizeLower(value);

  if (raw === "completed") {
    return {
      background: "#eef8f0",
      color: "#2f7d62",
      border: "1px solid rgba(47,125,98,0.18)",
    };
  }

  if (raw === "processing" || raw === "approved") {
    return {
      background: "#eef4fb",
      color: "#315f95",
      border: "1px solid rgba(49,95,149,0.16)",
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

export default function AdminOrdersPage() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, OrderLineItem[]>>({});
  const [itemsLoadingId, setItemsLoadingId] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadOrders() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/admin/orders/list", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load orders.");
      }

      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);

      const nextStatusMap: Record<string, string> = {};
      nextItems.forEach((item: OrderItem) => {
        nextStatusMap[item.id] = item.status || "pending";
      });
      setStatusMap(nextStatusMap);
    } catch (error) {
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
      const matchesSearch =
        !query ||
        normalizeLower(item.order_number).includes(query) ||
        normalizeLower(item.company_name).includes(query) ||
        normalizeLower(item.customer_id).includes(query);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : normalizeLower(item.status) === normalizeLower(statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [items, searchInput, statusFilter]);

  const stats = useMemo(() => {
    const pending = items.filter((item) => normalizeLower(item.status) === "pending").length;
    const approved = items.filter((item) => normalizeLower(item.status) === "approved").length;
    const processing = items.filter(
      (item) => normalizeLower(item.status) === "processing"
    ).length;
    const completed = items.filter(
      (item) => normalizeLower(item.status) === "completed"
    ).length;
    const cancelled = items.filter(
      (item) => normalizeLower(item.status) === "cancelled"
    ).length;

    return {
      total: items.length,
      pending,
      approved,
      processing,
      completed,
      cancelled,
    };
  }, [items]);

  async function handleUpdateStatus(orderId: string) {
    try {
      setSavingId(orderId);
      setSuccessMessage("");

      const response = await fetch("/api/admin/orders/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          status: statusMap[orderId] || "pending",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to update order status.");
      }

      setSuccessMessage(
        `Order ${data?.order?.orderNumber || ""} updated successfully.`
      );
      await loadOrders();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setSavingId("");
    }
  }

  async function loadOrderItems(orderId: string) {
    try {
      setItemsLoadingId(orderId);

      const response = await fetch(
        `/api/admin/orders/items?orderId=${encodeURIComponent(orderId)}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load order items.");
      }

      setOrderItemsMap((prev) => ({
        ...prev,
        [orderId]: Array.isArray(data.items) ? data.items : [],
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "An unknown error occurred.");
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
    <div style={{ display: "grid", gap: 24 }}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Orders</h1>
          <p style={subtitleStyle}>
            Review submitted B2B orders, filter by order status, inspect line
            items, and update operational progress directly from the admin panel.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <a href="/api/admin/orders/export?format=csv" style={secondaryButtonStyle}>
            Export CSV
          </a>
          <a href="/api/admin/orders/export?format=json" style={secondaryButtonStyle}>
            Export JSON
          </a>
          <a href="/api/admin/orders/export?format=xml" style={secondaryButtonStyle}>
            Export XML
          </a>
        </div>
      </div>

      <div style={filterCardStyle}>
        <div style={statsRowStyle}>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Total Orders</div>
            <div style={statValueStyle}>{stats.total}</div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>Pending</div>
            <div style={warningStatValueStyle}>{stats.pending}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Approved</div>
            <div style={statValueStyle}>{stats.approved}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Processing</div>
            <div style={statValueStyle}>{stats.processing}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Completed</div>
            <div style={statValueStyle}>{stats.completed}</div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>Cancelled</div>
            <div style={warningStatValueStyle}>{stats.cancelled}</div>
          </div>
        </div>

        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Search</label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by order number, company, or customer ID"
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
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {successMessage ? <div style={successBoxStyle}>{successMessage}</div> : null}

      {loading ? (
        <div style={cardStyle}>Loading...</div>
      ) : errorMessage ? (
        <div style={errorBoxStyle}>{errorMessage}</div>
      ) : filteredItems.length === 0 ? (
        <div style={cardStyle}>No orders matched your current filters.</div>
      ) : (
        <div style={listGridStyle}>
          {filteredItems.map((item) => {
            const isExpanded = expandedOrderId === item.id;
            const orderLines = orderItemsMap[item.id] || [];

            return (
              <div key={item.id || item.order_number} style={cardStyle}>
                <div style={cardTopStyle}>
                  <div>
                    <div style={orderTitleStyle}>{item.order_number || "-"}</div>
                    <div style={contactStyle}>
                      {item.company_name || "-"} • {item.customer_id || "-"}
                    </div>
                  </div>

                  <div
                    style={{
                      ...statusPillStyle,
                      ...getStatusStyle(item.status),
                    }}
                  >
                    {item.status || "pending"}
                  </div>
                </div>

                <div style={metaGridStyle}>
                  <div>
                    <div style={metaLabelStyle}>Subtotal</div>
                    <div style={metaValueStyle}>
                      {formatMoney(item.subtotal, item.currency)}
                    </div>
                  </div>

                  <div>
                    <div style={metaLabelStyle}>Currency</div>
                    <div style={metaValueStyle}>{item.currency || "-"}</div>
                  </div>

                  <div>
                    <div style={metaLabelStyle}>Created</div>
                    <div style={metaValueStyle}>{formatDate(item.created_at)}</div>
                  </div>

                  <div>
                    <div style={metaLabelStyle}>Updated</div>
                    <div style={metaValueStyle}>{formatDate(item.updated_at)}</div>
                  </div>
                </div>

                {item.notes ? (
                  <div style={notesBoxStyle}>
                    <strong>Notes:</strong> {item.notes}
                  </div>
                ) : null}

                <div style={statusEditorWrapStyle}>
                  <div style={{ minWidth: 220 }}>
                    <div style={metaLabelStyle}>Update Status</div>
                    <select
                      value={statusMap[item.id] || item.status || "pending"}
                      onChange={(e) =>
                        setStatusMap((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      style={selectStyle}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={actionsRowStyle}>
                    <button
                      type="button"
                      onClick={() => handleToggleItems(item.id)}
                      style={secondaryButtonStyle}
                    >
                      {isExpanded ? "Hide Items" : "View Items"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(item.id)}
                      disabled={savingId === item.id}
                      style={primaryButtonStyle}
                    >
                      {savingId === item.id ? "Saving..." : "Save Status"}
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div style={itemsPanelStyle}>
                    <div style={itemsPanelTitleStyle}>Order Items</div>

                    {itemsLoadingId === item.id ? (
                      <div style={emptyItemsStyle}>Loading order items...</div>
                    ) : orderLines.length === 0 ? (
                      <div style={emptyItemsStyle}>
                        No line items found for this order.
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 12 }}>
                        {orderLines.map((line) => (
                          <div key={line.id} style={lineItemCardStyle}>
                            <div style={lineItemTopStyle}>
                              <div>
                                <div style={lineItemTitleStyle}>
                                  {line.product_title || "-"}
                                </div>
                                <div style={lineItemMetaStyle}>
                                  Variant: {line.variant_label || "-"}
                                </div>
                                <div style={lineItemMetaStyle}>
                                  SKU: {line.sku || "-"}
                                </div>
                              </div>

                              <div style={{ textAlign: "right" }}>
                                <div style={lineItemPriceStyle}>
                                  {formatMoney(line.line_total, item.currency)}
                                </div>
                                <div style={lineItemMetaStyle}>
                                  {line.quantity} ×{" "}
                                  {formatMoney(line.unit_price, item.currency)}
                                </div>
                              </div>
                            </div>

                            <div style={lineItemBottomStyle}>
                              <span>Product Slug: {line.product_slug || "-"}</span>
                              <span>Created: {formatDate(line.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
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

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
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

const listGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const cardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 18,
};

const orderTitleStyle: React.CSSProperties = {
  fontSize: 24,
  lineHeight: 1.15,
  fontWeight: 800,
  color: "#171717",
  marginBottom: 6,
};

const contactStyle: React.CSSProperties = {
  color: "#665d52",
  lineHeight: 1.7,
  fontSize: 14,
};

const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 800,
};

const metaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
};

const metaLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 6,
};

const metaValueStyle: React.CSSProperties = {
  color: "#171717",
  lineHeight: 1.7,
  fontWeight: 700,
  fontSize: 14,
};

const notesBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 16,
  background: "#faf8f4",
  border: "1px solid #e8dfd2",
  color: "#665d52",
  lineHeight: 1.8,
  fontSize: 14,
};

const statusEditorWrapStyle: React.CSSProperties = {
  marginTop: 18,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  paddingTop: 16,
  borderTop: "1px solid #eee5d9",
};

const actionsRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 15,
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

const itemsPanelStyle: React.CSSProperties = {
  marginTop: 18,
  paddingTop: 18,
  borderTop: "1px solid #eee5d9",
  display: "grid",
  gap: 14,
};

const itemsPanelTitleStyle: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#171717",
};

const emptyItemsStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  background: "#faf8f4",
  border: "1px solid #e8dfd2",
  color: "#665d52",
  fontWeight: 700,
};

const lineItemCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid #e8dfd2",
  background: "#fcfbf8",
  padding: 16,
  display: "grid",
  gap: 12,
};

const lineItemTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const lineItemTitleStyle: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1.25,
  fontWeight: 800,
  color: "#171717",
  marginBottom: 4,
};

const lineItemMetaStyle: React.CSSProperties = {
  color: "#665d52",
  fontSize: 14,
  lineHeight: 1.7,
};

const lineItemPriceStyle: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#171717",
  marginBottom: 4,
};

const lineItemBottomStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  paddingTop: 10,
  borderTop: "1px solid #eee5d9",
  color: "#7a7166",
  fontSize: 13,
  lineHeight: 1.6,
};

const successBoxStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
};