"use client";

import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id: string;
  order_number: string;
  cart_id?: string;
  customer_id: string;
  customer_company_id?: string;
  customer_user_id?: string;

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
  payment_status: string;
  fulfillment_status: string;
  currency: string;

  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  item_count: number;

  notes: string;
  created_at: string;
  updated_at: string;
};

type OrderLineItem = {
  id: string;
  order_id: string;
  product_id?: string;
  product_slug: string;
  variant_id: string;
  sku: string;
  product_title: string;
  variant_label: string;
  image?: string;
  box_quantity?: number;
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

type ApiUpdateResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  order?: {
    order_number?: string;
    status?: string;
    payment_status?: string;
    fulfillment_status?: string;
    grand_total?: number;
  };
};

type ApiOrderItemsResponse = {
  ok?: boolean;
  error?: string;
  total?: number;
  items?: OrderLineItem[];
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

const PAYMENT_STATUS_OPTIONS = [
  "pending",
  "awaiting_payment",
  "partially_paid",
  "paid",
  "refunded",
  "cancelled",
];

const FULFILLMENT_STATUS_OPTIONS = [
  "unfulfilled",
  "partial",
  "fulfilled",
  "cancelled",
];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function getContactName(item: OrderItem) {
  return [item.first_name, item.last_name].filter(Boolean).join(" ").trim();
}

function formatMoney(value: unknown, currency = "USD") {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(number || 0);
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusStyle(value?: string): React.CSSProperties {
  const raw = normalizeLower(value);

  if (
    raw === "completed" ||
    raw === "paid" ||
    raw === "approved" ||
    raw === "processing" ||
    raw === "fulfilled"
  ) {
    return {
      background: "#eef8f0",
      color: "#2f7d62",
      border: "1px solid rgba(47,125,98,0.18)",
    };
  }

  if (
    raw === "quoted" ||
    raw === "reviewing" ||
    raw === "submitted" ||
    raw === "awaiting_payment" ||
    raw === "pending"
  ) {
    return {
      background: "#fff7e8",
      color: "#8a6418",
      border: "1px solid rgba(138,100,24,0.18)",
    };
  }

  if (raw === "cancelled" || raw === "refunded") {
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

function getInitialEditState(item: OrderItem) {
  return {
    status: item.status || "submitted",
    payment_status: item.payment_status || "pending",
    fulfillment_status: item.fulfillment_status || "unfulfilled",
    discount_total: String(item.discount_total || 0),
    shipping_total: String(item.shipping_total || 0),
    tax_total: String(item.tax_total || 0),
    internal_notes: "",
  };
}

export default function AdminOrdersPage() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingOrderNumber, setSavingOrderNumber] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const [editingOrderNumber, setEditingOrderNumber] = useState("");
  const [editForm, setEditForm] = useState({
    status: "submitted",
    payment_status: "pending",
    fulfillment_status: "unfulfilled",
    discount_total: "0",
    shipping_total: "0",
    tax_total: "0",
    internal_notes: "",
  });

  const [expandedOrderNumber, setExpandedOrderNumber] = useState("");
  const [itemsLoadingOrderNumber, setItemsLoadingOrderNumber] = useState("");
  const [orderItemsMap, setOrderItemsMap] = useState<
    Record<string, OrderLineItem[]>
  >({});

  async function loadOrders() {
    try {
      setLoading(true);
      setErrorMessage("");

      const params = new URLSearchParams();

      if (searchInput.trim()) {
        params.set("q", searchInput.trim());
      }

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      if (paymentFilter !== "all") {
        params.set("payment_status", paymentFilter);
      }

      const url = params.toString()
        ? `/api/admin/orders/list?${params.toString()}`
        : "/api/admin/orders/list";

      const response = await fetch(url, {
        cache: "no-store",
        credentials: "include",
      });

      const data = await readJsonResponse<ApiListResponse>(
        response,
        "Failed to load quote requests."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load quote requests.");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
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
    void loadOrders();
  }, []);

  const stats = useMemo(() => {
    return {
      total: items.length,
      submitted: items.filter(
        (item) => normalizeLower(item.status) === "submitted"
      ).length,
      quoted: items.filter((item) => normalizeLower(item.status) === "quoted")
        .length,
      approved: items.filter(
        (item) => normalizeLower(item.status) === "approved"
      ).length,
      paid: items.filter(
        (item) => normalizeLower(item.payment_status) === "paid"
      ).length,
      completed: items.filter(
        (item) => normalizeLower(item.status) === "completed"
      ).length,
    };
  }, [items]);

  function openEdit(item: OrderItem) {
    setEditingOrderNumber(item.order_number);
    setEditForm(getInitialEditState(item));
    setSuccessMessage("");
    setErrorMessage("");
  }

  function closeEdit() {
    setEditingOrderNumber("");
    setEditForm({
      status: "submitted",
      payment_status: "pending",
      fulfillment_status: "unfulfilled",
      discount_total: "0",
      shipping_total: "0",
      tax_total: "0",
      internal_notes: "",
    });
  }

  async function updateOrder(
    orderNumber: string,
    payload: Partial<typeof editForm>
  ) {
    try {
      setSavingOrderNumber(orderNumber);
      setSuccessMessage("");
      setErrorMessage("");

      const response = await fetch("/api/admin/orders/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          order_number: orderNumber,
          ...payload,
        }),
      });

      const data = await readJsonResponse<ApiUpdateResponse>(
        response,
        "Failed to update order."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to update order.");
      }

      setSuccessMessage(
        `Order ${data.order?.order_number || orderNumber} updated successfully.`
      );

      await loadOrders();
      closeEdit();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setSavingOrderNumber("");
    }
  }

  async function saveEdit(orderNumber: string) {
    await updateOrder(orderNumber, {
      status: editForm.status,
      payment_status: editForm.payment_status,
      fulfillment_status: editForm.fulfillment_status,
      discount_total: editForm.discount_total,
      shipping_total: editForm.shipping_total,
      tax_total: editForm.tax_total,
      internal_notes: editForm.internal_notes,
    });
  }

  async function quickAction(
    item: OrderItem,
    action:
      | "reviewing"
      | "quoted"
      | "approved"
      | "paid"
      | "processing"
      | "completed"
      | "cancelled"
  ) {
    if (action === "reviewing") {
      await updateOrder(item.order_number, {
        status: "reviewing",
      });
      return;
    }

    if (action === "quoted") {
      await updateOrder(item.order_number, {
        status: "quoted",
        payment_status: "awaiting_payment",
      });
      return;
    }

    if (action === "approved") {
      await updateOrder(item.order_number, {
        status: "approved",
        payment_status: "awaiting_payment",
      });
      return;
    }

    if (action === "paid") {
      await updateOrder(item.order_number, {
        status: "processing",
        payment_status: "paid",
      });
      return;
    }

    if (action === "processing") {
      await updateOrder(item.order_number, {
        status: "processing",
      });
      return;
    }

    if (action === "completed") {
      await updateOrder(item.order_number, {
        status: "completed",
        payment_status: "paid",
        fulfillment_status: "fulfilled",
      });
      return;
    }

    if (action === "cancelled") {
      await updateOrder(item.order_number, {
        status: "cancelled",
        payment_status: "cancelled",
        fulfillment_status: "cancelled",
      });
    }
  }

  async function loadOrderItems(item: OrderItem) {
    try {
      setItemsLoadingOrderNumber(item.order_number);
      setErrorMessage("");

      const response = await fetch(
        `/api/admin/orders/items?orderId=${encodeURIComponent(item.id)}`,
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const data = await readJsonResponse<ApiOrderItemsResponse>(
        response,
        "Failed to load order items."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load order items.");
      }

      setOrderItemsMap((prev) => ({
        ...prev,
        [item.order_number]: Array.isArray(data.items) ? data.items : [],
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setItemsLoadingOrderNumber("");
    }
  }

  async function toggleOrderItems(item: OrderItem) {
    if (expandedOrderNumber === item.order_number) {
      setExpandedOrderNumber("");
      return;
    }

    setExpandedOrderNumber(item.order_number);

    if (!orderItemsMap[item.order_number]) {
      await loadOrderItems(item);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Quote Requests</h1>
          <p style={subtitleStyle}>
            Review B2B quote requests, update final quote totals, payment
            status, and fulfillment status.
          </p>
        </div>

        <button type="button" onClick={loadOrders} style={refreshButtonStyle}>
          Refresh
        </button>
      </div>

      <section style={toolbarStyle}>
        <div style={statsBarStyle}>
          <Metric label="Total" value={stats.total} />
          <Metric label="Submitted" value={stats.submitted} warning />
          <Metric label="Quoted" value={stats.quoted} />
          <Metric label="Approved" value={stats.approved} />
          <Metric label="Paid" value={stats.paid} />
          <Metric label="Completed" value={stats.completed} />
        </div>

        <div style={filterGridStyle}>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search order number, company, email, phone, city, country..."
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

          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            style={selectStyle}
          >
            <option value="all">All payments</option>
            {PAYMENT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button type="button" onClick={loadOrders} style={applyButtonStyle}>
            Apply
          </button>
        </div>
      </section>

      {successMessage ? (
        <div style={successBoxStyle}>{successMessage}</div>
      ) : null}

      {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}

      <section style={tableWrapStyle}>
        <div style={tableHeaderStyle}>
          <div>Request</div>
          <div>Buyer</div>
          <div>Total</div>
          <div>Status</div>
          <div>Payment</div>
          <div>Fulfillment</div>
          <div>Created</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {loading ? (
          <div style={emptyStateStyle}>Loading quote requests...</div>
        ) : items.length === 0 ? (
          <div style={emptyStateStyle}>No quote requests found.</div>
        ) : (
          items.map((item) => {
            const isEditing = editingOrderNumber === item.order_number;
            const isExpanded = expandedOrderNumber === item.order_number;
            const contactName = getContactName(item);
            const orderLines = orderItemsMap[item.order_number] || [];

            return (
              <div key={item.id || item.order_number}>
                <div style={tableRowStyle}>
                  <div>
                    <div style={orderNumberStyle}>
                      {item.order_number || "-"}
                    </div>

                    <div style={subTextStyle}>
                      Total Qty: {Number(item.item_count || 0)}
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
                      {formatMoney(item.grand_total, item.currency)}
                    </div>

                    <div style={subTextStyle}>
                      Subtotal: {formatMoney(item.subtotal, item.currency)}
                    </div>
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
                    <span
                      style={{
                        ...statusPillStyle,
                        ...getStatusStyle(item.payment_status),
                      }}
                    >
                      {item.payment_status || "pending"}
                    </span>
                  </div>

                  <div>
                    <span
                      style={{
                        ...statusPillStyle,
                        ...getStatusStyle(item.fulfillment_status),
                      }}
                    >
                      {item.fulfillment_status || "unfulfilled"}
                    </span>
                  </div>

                  <div>
                    <div>{formatDate(item.created_at)}</div>
                    <div style={subTextStyle}>
                      Updated: {formatDate(item.updated_at)}
                    </div>
                  </div>

                  <div style={rowActionsStyle}>
                    <button
                      type="button"
                      onClick={() => quickAction(item, "reviewing")}
                      disabled={savingOrderNumber === item.order_number}
                      style={compactButtonStyle}
                    >
                      Reviewing
                    </button>

                    <button
                      type="button"
                      onClick={() => quickAction(item, "paid")}
                      disabled={savingOrderNumber === item.order_number}
                      style={compactPrimaryButtonStyle}
                    >
                      Paid
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      disabled={savingOrderNumber === item.order_number}
                      style={compactButtonStyle}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleOrderItems(item)}
                      disabled={itemsLoadingOrderNumber === item.order_number}
                      style={compactButtonStyle}
                    >
                      {isExpanded ? "Hide" : "Details"}
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div style={editPanelStyle}>
                    <div style={editGridStyle}>
                      <label style={fieldStyle}>
                        <span>Status</span>
                        <select
                          value={editForm.status}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              status: event.target.value,
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
                      </label>

                      <label style={fieldStyle}>
                        <span>Payment</span>
                        <select
                          value={editForm.payment_status}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              payment_status: event.target.value,
                            }))
                          }
                          style={selectStyle}
                        >
                          {PAYMENT_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={fieldStyle}>
                        <span>Fulfillment</span>
                        <select
                          value={editForm.fulfillment_status}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              fulfillment_status: event.target.value,
                            }))
                          }
                          style={selectStyle}
                        >
                          {FULFILLMENT_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={fieldStyle}>
                        <span>Discount</span>
                        <input
                          value={editForm.discount_total}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              discount_total: event.target.value,
                            }))
                          }
                          type="number"
                          step="0.01"
                          style={inputStyle}
                        />
                      </label>

                      <label style={fieldStyle}>
                        <span>Shipping / Freight</span>
                        <input
                          value={editForm.shipping_total}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              shipping_total: event.target.value,
                            }))
                          }
                          type="number"
                          step="0.01"
                          style={inputStyle}
                        />
                      </label>

                      <label style={fieldStyle}>
                        <span>Tax</span>
                        <input
                          value={editForm.tax_total}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              tax_total: event.target.value,
                            }))
                          }
                          type="number"
                          step="0.01"
                          style={inputStyle}
                        />
                      </label>
                    </div>

                    <label style={fieldStyle}>
                      <span>Internal Notes</span>
                      <textarea
                        value={editForm.internal_notes}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            internal_notes: event.target.value,
                          }))
                        }
                        rows={3}
                        style={textareaStyle}
                      />
                    </label>

                    <div style={editActionsStyle}>
                      <button
                        type="button"
                        onClick={() => saveEdit(item.order_number)}
                        disabled={savingOrderNumber === item.order_number}
                        style={compactPrimaryButtonStyle}
                      >
                        {savingOrderNumber === item.order_number
                          ? "Saving..."
                          : "Save Changes"}
                      </button>

                      <button
                        type="button"
                        onClick={() => quickAction(item, "quoted")}
                        disabled={savingOrderNumber === item.order_number}
                        style={compactButtonStyle}
                      >
                        Mark Quoted
                      </button>

                      <button
                        type="button"
                        onClick={() => quickAction(item, "approved")}
                        disabled={savingOrderNumber === item.order_number}
                        style={compactButtonStyle}
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => quickAction(item, "completed")}
                        disabled={savingOrderNumber === item.order_number}
                        style={compactButtonStyle}
                      >
                        Complete
                      </button>

                      <button
                        type="button"
                        onClick={() => quickAction(item, "cancelled")}
                        disabled={savingOrderNumber === item.order_number}
                        style={dangerButtonStyle}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={closeEdit}
                        style={compactButtonStyle}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : null}

                {isExpanded ? (
                  <div style={itemsPanelStyle}>
                    {itemsLoadingOrderNumber === item.order_number ? (
                      <div style={itemsEmptyStyle}>
                        Loading order items...
                      </div>
                    ) : !orderLines.length ? (
                      <div style={itemsEmptyStyle}>No order items found.</div>
                    ) : (
                      <div style={itemsTableStyle}>
                        <div style={itemsHeaderStyle}>
                          <div>Product</div>
                          <div>Variant</div>
                          <div>SKU</div>
                          <div>Box</div>
                          <div>Qty</div>
                          <div>Unit</div>
                          <div>Total</div>
                        </div>

                        {orderLines.map((line) => (
                          <div key={line.id} style={itemsRowStyle}>
                            <div style={productCellStyle}>
                              {line.image ? (
                                <img
                                  src={line.image}
                                  alt={line.product_title || "Product"}
                                  loading="lazy"
                                  decoding="async"
                                  style={itemImageStyle}
                                />
                              ) : (
                                <div style={itemImagePlaceholderStyle}>
                                  No
                                </div>
                              )}

                              <div style={{ minWidth: 0 }}>
                                <div style={cellStrongStyle}>
                                  {line.product_title || "-"}
                                </div>
                                <div style={subTextStyle}>
                                  {line.product_slug || "-"}
                                </div>
                              </div>
                            </div>

                            <div>{line.variant_label || "-"}</div>
                            <div>{line.sku || "-"}</div>
                            <div>{line.box_quantity || "-"}</div>
                            <div>{line.quantity || 0}</div>
                            <div>{formatMoney(line.unit_price, item.currency)}</div>
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

const refreshButtonStyle: React.CSSProperties = {
  minHeight: 36,
  borderRadius: 10,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
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
  gridTemplateColumns: "minmax(0, 1fr) 180px 180px 90px",
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

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 90,
  border: "1px solid #d8cebf",
  borderRadius: 10,
  background: "#fcfbf8",
  padding: 12,
  outline: "none",
  fontSize: 13,
  resize: "vertical",
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

const applyButtonStyle: React.CSSProperties = {
  minHeight: 38,
  border: "1px solid #171717",
  borderRadius: 10,
  background: "#171717",
  color: "#fff",
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};

const tableWrapStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 14,
  overflow: "hidden",
};

const tableHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1.3fr 0.8fr 0.8fr 0.9fr 0.9fr 0.9fr 1.55fr",
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
  gridTemplateColumns: "1fr 1.3fr 0.8fr 0.8fr 0.9fr 0.9fr 0.9fr 1.55fr",
  gap: 10,
  alignItems: "center",
  minHeight: 72,
  padding: "10px 12px",
  borderBottom: "1px solid #f0e7da",
  fontSize: 13,
  color: "#171717",
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
  flexWrap: "wrap",
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

const dangerButtonStyle: React.CSSProperties = {
  ...compactButtonStyle,
  background: "#fff4f2",
  border: "1px solid rgba(165,74,63,0.22)",
  color: "#a54a3f",
};

const editPanelStyle: React.CSSProperties = {
  background: "#fcfbf8",
  borderBottom: "1px solid #f0e7da",
  padding: "14px 18px",
  display: "grid",
  gap: 12,
};

const editGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 10,
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  fontWeight: 800,
  color: "#6f6559",
};

const editActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const itemsPanelStyle: React.CSSProperties = {
  background: "#fcfbf8",
  borderBottom: "1px solid #f0e7da",
  padding: "14px 18px",
};

const itemsTableStyle: React.CSSProperties = {
  border: "1px solid #e2d8cb",
  borderRadius: 12,
  overflow: "hidden",
  background: "#fff",
};

const itemsHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.8fr 0.9fr 0.9fr 0.45fr 0.45fr 0.7fr 0.7fr",
  gap: 10,
  minHeight: 38,
  alignItems: "center",
  padding: "0 12px",
  background: "#f8f5ef",
  borderBottom: "1px solid #e2d8cb",
  color: "#6f6559",
  fontSize: 12,
  fontWeight: 800,
};

const itemsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.8fr 0.9fr 0.9fr 0.45fr 0.45fr 0.7fr 0.7fr",
  gap: 10,
  minHeight: 54,
  alignItems: "center",
  padding: "10px 12px",
  borderBottom: "1px solid #f0e7da",
  fontSize: 12,
  color: "#171717",
};

const productCellStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px minmax(0, 1fr)",
  gap: 10,
  alignItems: "center",
};

const itemImageStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 8,
  objectFit: "cover",
  background: "#f8f5ef",
  border: "1px solid #e2d8cb",
};

const itemImagePlaceholderStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 8,
  background: "#f8f5ef",
  border: "1px solid #e2d8cb",
  color: "#9a9084",
  fontSize: 10,
  fontWeight: 800,
  display: "grid",
  placeItems: "center",
};

const itemsEmptyStyle: React.CSSProperties = {
  padding: 14,
  color: "#756b60",
  fontWeight: 700,
  fontSize: 13,
};

const emptyStateStyle: React.CSSProperties = {
  padding: 18,
  color: "#756b60",
  fontWeight: 700,
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