"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearDraftOrder,
  DraftOrderItem,
  getDraftOrderItemKey,
  getDraftOrderSubtotal,
  loadDraftOrder,
  removeDraftOrderItem,
  updateDraftOrderQuantity,
} from "../../components/b2b/order-draft";

type CustomerSession = {
  customerId: string;
  email: string;
  companyName: string;
  priceTier: string;
  currency: string;
};

type OrderHistoryItem = {
  id: string;
  orderNumber: string;
  customerId: string;
  companyName: string;
  status: string;
  subtotal: number;
  currency: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

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

function normalizeStatusLabel(value?: string) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return "Pending";
  if (raw === "pending") return "Pending";
  if (raw === "approved") return "Approved";
  if (raw === "processing") return "Processing";
  if (raw === "completed") return "Completed";
  if (raw === "cancelled") return "Cancelled";

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getStatusPillStyle(status?: string): React.CSSProperties {
  const raw = String(status || "").trim().toLowerCase();

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

export default function AccountPage() {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [items, setItems] = useState<DraftOrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  async function loadSession() {
    const response = await fetch("/api/customer-auth/me", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || !data.ok || !data.authenticated) {
      window.location.href = "/portal-login";
      return null;
    }

    const nextCustomer = data.customer || null;
    setCustomer(nextCustomer);
    return nextCustomer;
  }

  async function loadOrderHistory() {
    try {
      setHistoryLoading(true);

      const response = await fetch("/api/orders/history", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setOrderHistory([]);
        return;
      }

      setOrderHistory(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      setOrderHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function loadDraft() {
    setItems(loadDraftOrder());
  }

  useEffect(() => {
    async function boot() {
      const session = await loadSession();

      if (!session) return;

      loadDraft();
      await loadOrderHistory();
      setLoading(false);
    }

    boot();

    function handleDraftUpdate() {
      loadDraft();
    }

    window.addEventListener(
      "ptx-order-draft-updated",
      handleDraftUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "ptx-order-draft-updated",
        handleDraftUpdate as EventListener
      );
    };
  }, []);

  const subtotal = useMemo(() => getDraftOrderSubtotal(items), [items]);
  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items]
  );

  async function handleLogout() {
    await fetch("/api/customer-auth/logout", {
      method: "POST",
    });

    window.location.href = "/portal-login";
  }

  async function handleSubmitOrder() {
    try {
      setSubmitLoading(true);
      setMessage("");

      if (!items.length) {
        throw new Error("Your draft order is empty.");
      }

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes,
          items,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Order submission failed.");
      }

      clearDraftOrder();
      setItems([]);
      setNotes("");
      setMessage(`Order submitted successfully. Order number: ${data.orderNumber}`);

      await loadOrderHistory();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) {
    return <main style={pageWrapStyle}>Loading...</main>;
  }

  return (
    <main style={pageWrapStyle}>
      <div style={containerStyle}>
        <div style={topBarStyle}>
          <div>
            <div style={eyebrowStyle}>Customer Portal</div>
            <h1 style={titleStyle}>{customer?.companyName || "Account"}</h1>
            <p style={subtitleStyle}>
              Logged in as {customer?.email || "-"} • Price tier:{" "}
              {customer?.priceTier || "standard"}
            </p>
          </div>

          <button type="button" onClick={handleLogout} style={secondaryButtonStyle}>
            Logout
          </button>
        </div>

        <section style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <div style={summaryKickerStyle}>Account</div>
            <div style={summaryValueStyle}>{customer?.companyName || "-"}</div>
            <div style={summaryMetaStyle}>{customer?.email || "-"}</div>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryKickerStyle}>Pricing Tier</div>
            <div style={summaryValueStyle}>{customer?.priceTier || "standard"}</div>
            <div style={summaryMetaStyle}>
              Currency: {customer?.currency || "USD"}
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryKickerStyle}>Draft Items</div>
            <div style={summaryValueStyle}>{items.length}</div>
            <div style={summaryMetaStyle}>{totalUnits} total units</div>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryKickerStyle}>Draft Value</div>
            <div style={summaryValueStyle}>
              {formatMoney(subtotal, customer?.currency)}
            </div>
            <div style={summaryMetaStyle}>Before final submission</div>
          </div>
        </section>

        <div style={gridStyle}>
          <section style={cardStyle}>
            <div style={sectionTitleStyle}>Draft order</div>

            {items.length === 0 ? (
              <div style={emptyStateStyle}>
                You have no products in your draft order yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {items.map((item) => {
                  const itemKey = getDraftOrderItemKey(item);

                  return (
                    <div key={itemKey} style={lineItemStyle}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontWeight: 800 }}>{item.productTitle}</div>
                        <div style={mutedStyle}>{item.variantLabel || "Default"}</div>
                        <div style={mutedStyle}>SKU: {item.sku || "-"}</div>
                        <div style={mutedStyle}>
                          Min order: {item.minOrderQuantity || 1} • Step:{" "}
                          {item.quantityStep || 1}
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                        <div style={{ fontWeight: 800 }}>
                          {formatMoney(item.unitPrice, customer?.currency)}
                        </div>

                        <input
                          type="number"
                          min={item.minOrderQuantity || 1}
                          step={item.quantityStep || 1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateDraftOrderQuantity(itemKey, Number(e.target.value || 1))
                          }
                          style={qtyInputStyle}
                        />

                        <div style={{ fontWeight: 800 }}>
                          {formatMoney(item.lineTotal, customer?.currency)}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeDraftOrderItem(itemKey)}
                          style={dangerButtonStyle}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside style={cardStyle}>
            <div style={sectionTitleStyle}>Order summary</div>

            <div style={summaryRowStyle}>
              <span>Items</span>
              <strong>{items.length}</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Total units</span>
              <strong>{totalUnits}</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Subtotal</span>
              <strong>{formatMoney(subtotal, customer?.currency)}</strong>
            </div>

            <div style={{ marginTop: 18 }}>
              <label style={labelStyle}>Order notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={textareaStyle}
                placeholder="Add shipping notes, purchase order notes, or special instructions."
              />
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={submitLoading || !items.length}
                style={primaryButtonStyle}
              >
                {submitLoading ? "Submitting..." : "Submit Order"}
              </button>

              <a href="/products" style={secondaryLinkStyle}>
                Continue browsing products
              </a>
            </div>

            {message ? <div style={messageBoxStyle}>{message}</div> : null}
          </aside>
        </div>

        <section style={cardStyle}>
          <div style={sectionTitleStyle}>Recent orders</div>

          {historyLoading ? (
            <div style={emptyStateStyle}>Loading order history...</div>
          ) : orderHistory.length === 0 ? (
            <div style={emptyStateStyle}>
              No submitted orders found for this account yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {orderHistory.map((order) => (
                <div key={order.id || order.orderNumber} style={orderCardStyle}>
                  <div style={orderCardTopStyle}>
                    <div>
                      <div style={orderNumberStyle}>
                        {order.orderNumber || "Order"}
                      </div>
                      <div style={mutedStyle}>
                        Created: {formatDate(order.createdAt)}
                      </div>
                    </div>

                    <div
                      style={{
                        ...statusPillBaseStyle,
                        ...getStatusPillStyle(order.status),
                      }}
                    >
                      {normalizeStatusLabel(order.status)}
                    </div>
                  </div>

                  <div style={orderMetaGridStyle}>
                    <div>
                      <div style={orderMetaLabelStyle}>Subtotal</div>
                      <div style={orderMetaValueStyle}>
                        {formatMoney(order.subtotal, order.currency || customer?.currency)}
                      </div>
                    </div>

                    <div>
                      <div style={orderMetaLabelStyle}>Company</div>
                      <div style={orderMetaValueStyle}>
                        {order.companyName || customer?.companyName || "-"}
                      </div>
                    </div>

                    <div>
                      <div style={orderMetaLabelStyle}>Updated</div>
                      <div style={orderMetaValueStyle}>
                        {formatDate(order.updatedAt)}
                      </div>
                    </div>
                  </div>

                  {order.notes ? (
                    <div style={orderNotesStyle}>
                      <strong>Notes:</strong> {order.notes}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const pageWrapStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f7f4ee",
  padding: "40px 20px",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1240,
  margin: "0 auto",
  display: "grid",
  gap: 24,
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 10,
};

const titleStyle: React.CSSProperties = {
  fontSize: 42,
  lineHeight: 1.06,
  margin: "0 0 8px",
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#665d52",
  lineHeight: 1.7,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
};

const summaryCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5ddd2",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const summaryKickerStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 10,
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: 24,
  lineHeight: 1.15,
  fontWeight: 800,
  color: "#171717",
  marginBottom: 6,
};

const summaryMetaStyle: React.CSSProperties = {
  color: "#665d52",
  lineHeight: 1.7,
  fontSize: 14,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.3fr 0.7fr",
  gap: 24,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5ddd2",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  marginBottom: 18,
};

const emptyStateStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px dashed #d9cfbf",
  background: "#faf8f4",
  padding: 22,
  color: "#6f6559",
  fontWeight: 700,
};

const lineItemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 18,
  paddingBottom: 14,
  borderBottom: "1px solid #eee5d9",
};

const mutedStyle: React.CSSProperties = {
  color: "#6f6559",
  fontSize: 14,
};

const qtyInputStyle: React.CSSProperties = {
  width: 110,
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  padding: "0 12px",
  fontSize: 15,
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  paddingBottom: 12,
  marginBottom: 12,
  borderBottom: "1px solid #eee5d9",
  color: "#171717",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 800,
  fontSize: 14,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 120,
  borderRadius: 16,
  border: "1px solid #dcd1c0",
  background: "#fcfbf8",
  padding: "14px 16px",
  fontSize: 15,
  outline: "none",
  resize: "vertical",
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 52,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  minHeight: 38,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid #e8caca",
  background: "#fff5f5",
  color: "#8d2f2f",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  borderRadius: 999,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  textDecoration: "none",
};

const messageBoxStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 14,
  borderRadius: 16,
  background: "#f8f5ef",
  border: "1px solid #e5ddd2",
  color: "#171717",
  fontWeight: 700,
};

const orderCardStyle: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid #e8dfd2",
  background: "#fcfbf8",
  padding: 18,
  display: "grid",
  gap: 14,
};

const orderCardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const orderNumberStyle: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#171717",
  marginBottom: 4,
};

const statusPillBaseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 800,
};

const orderMetaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const orderMetaLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 6,
};

const orderMetaValueStyle: React.CSSProperties = {
  color: "#171717",
  fontWeight: 700,
  lineHeight: 1.6,
};

const orderNotesStyle: React.CSSProperties = {
  borderTop: "1px solid #eee5d9",
  paddingTop: 12,
  color: "#665d52",
  lineHeight: 1.75,
  fontSize: 14,
};