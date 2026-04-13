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

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(value || 0);
}

export default function AccountPage() {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [items, setItems] = useState<DraftOrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSession() {
    const response = await fetch("/api/customer-auth/me", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || !data.ok || !data.authenticated) {
      window.location.href = "/portal-login";
      return;
    }

    setCustomer(data.customer || null);
  }

  function loadDraft() {
    setItems(loadDraftOrder());
  }

  useEffect(() => {
    Promise.all([loadSession()]).finally(() => {
      loadDraft();
      setLoading(false);
    });

    function handleDraftUpdate() {
      loadDraft();
    }

    window.addEventListener("ptx-order-draft-updated", handleDraftUpdate as EventListener);

    return () => {
      window.removeEventListener(
        "ptx-order-draft-updated",
        handleDraftUpdate as EventListener
      );
    };
  }, []);

  const subtotal = useMemo(() => getDraftOrderSubtotal(items), [items]);

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

            {message ? (
              <div style={messageBoxStyle}>{message}</div>
            ) : null}
          </aside>
        </div>
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