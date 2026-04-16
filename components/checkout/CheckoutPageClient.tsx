"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "../cart/CartContext";
import { formatMoney } from "../../lib/money";

type CheckoutApiResponse = {
  ok: boolean;
  error?: string;
  checkout_url?: string;
  session_id?: string;
};

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function CheckoutPageClient() {
  const { cart, isLoading } = useCart();

  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    company: "",
    phone: "",
    country: "",
    city: "",
    address_line_1: "",
    address_line_2: "",
    postal_code: "",
    billing_same_as_shipping: true,
    payment_method: "card",
    cardholder_name: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const items = cart?.items || [];
  const subtotal = Number(cart?.totals?.subtotal || 0);
  const itemCount = Number(cart?.totals?.item_count || 0);

  const canContinue = useMemo(() => {
    return (
      items.length > 0 &&
      Boolean(form.email.trim()) &&
      Boolean(form.first_name.trim()) &&
      Boolean(form.last_name.trim()) &&
      Boolean(form.address_line_1.trim()) &&
      Boolean(form.country.trim()) &&
      Boolean(form.city.trim())
    );
  }, [items.length, form]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!canContinue) {
      setError("Please complete the required checkout fields.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = (await parseJsonSafe(response)) as CheckoutApiResponse | null;

      if (!response.ok || !data?.ok || !data.checkout_url) {
        throw new Error(data?.error || "Failed to start checkout.");
      }

      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!items.length && !isLoading) {
    return (
      <div style={pageStyle}>
        <div style={emptyBoxStyle}>
          <h1 style={titleStyle}>Checkout</h1>
          <p style={textStyle}>Your cart is empty.</p>
          <Link href="/collections" style={primaryLinkStyle}>
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Checkout</h1>
        <p style={textStyle}>
          Complete your billing and shipping details, then continue securely to payment.
        </p>
      </div>

      <div style={layoutStyle}>
        <form onSubmit={onSubmit} style={formCardStyle}>
          <div style={sectionTitleStyle}>Contact Information</div>

          <div style={gridTwoStyle}>
            <Field
              label="First Name"
              required
              value={form.first_name}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, first_name: value }))
              }
            />
            <Field
              label="Last Name"
              required
              value={form.last_name}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, last_name: value }))
              }
            />
          </div>

          <div style={gridTwoStyle}>
            <Field
              label="Email"
              required
              value={form.email}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, email: value }))
              }
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, phone: value }))
              }
            />
          </div>

          <div style={gridOneStyle}>
            <Field
              label="Company"
              value={form.company}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, company: value }))
              }
            />
          </div>

          <div style={sectionTitleStyle}>Shipping Address</div>

          <div style={gridTwoStyle}>
            <Field
              label="Country"
              required
              value={form.country}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, country: value }))
              }
            />
            <Field
              label="City"
              required
              value={form.city}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, city: value }))
              }
            />
          </div>

          <div style={gridOneStyle}>
            <Field
              label="Address Line 1"
              required
              value={form.address_line_1}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, address_line_1: value }))
              }
            />
          </div>

          <div style={gridTwoStyle}>
            <Field
              label="Address Line 2"
              value={form.address_line_2}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, address_line_2: value }))
              }
            />
            <Field
              label="Postal Code"
              value={form.postal_code}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, postal_code: value }))
              }
            />
          </div>

          <div style={sectionTitleStyle}>Payment</div>

          <div style={paymentPanelStyle}>
            <div style={gridOneStyle}>
              <label style={labelStyle}>Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, payment_method: e.target.value }))
                }
                style={inputStyle}
              >
                <option value="card">Credit / Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div style={gridOneStyle}>
              <Field
                label="Cardholder Name"
                value={form.cardholder_name}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, cardholder_name: value }))
                }
              />
            </div>

            <div style={paymentNoticeStyle}>
              You will be redirected to Stripe&apos;s secure hosted payment page.
            </div>
          </div>

          {error ? <div style={errorStyle}>{error}</div> : null}

          <button
            type="submit"
            disabled={!canContinue || submitting}
            style={{
              ...submitButtonStyle,
              opacity: !canContinue || submitting ? 0.65 : 1,
              cursor: !canContinue || submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Redirecting..." : "Continue to Payment"}
          </button>
        </form>

        <aside style={summaryCardStyle}>
          <div style={sectionTitleStyle}>Order Summary</div>

          <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
            {items.map((item: any) => (
              <div key={item.id} style={summaryItemStyle}>
                <div style={summaryImageWrapStyle}>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.product_title}
                      style={summaryImageStyle}
                    />
                  ) : null}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={summaryTitleStyle}>{item.product_title}</div>

                  {item.variant_title ? (
                    <div style={summaryVariantStyle}>{item.variant_title}</div>
                  ) : null}

                  <div style={summaryMetaStyle}>
                    Qty: {item.quantity} • {formatMoney(item.line_total)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={totalsWrapStyle}>
            <div style={totalRowStyle}>
              <span>Items</span>
              <span>{itemCount}</span>
            </div>

            <div style={totalRowStyle}>
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>

            <div style={grandTotalRowStyle}>
              <span>Total</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
          </div>

          <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
            <Link href="/cart" style={secondaryLinkStyle}>
              Back to Cart
            </Link>

            <Link href="/order-request" style={secondaryLinkStyle}>
              Request Quote Instead
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  required,
  onChange,
}: {
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div style={fieldWrapStyle}>
      <label style={labelStyle}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={inputStyle}
      />
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: "40px 20px 80px",
};

const headerStyle: React.CSSProperties = {
  marginBottom: 28,
};

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 380px",
  gap: 24,
  alignItems: "start",
};

const formCardStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  background: "#fff",
  borderRadius: 24,
  padding: 24,
  display: "grid",
  gap: 18,
};

const summaryCardStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  background: "#fff",
  borderRadius: 24,
  padding: 24,
  position: "sticky",
  top: 20,
};

const emptyBoxStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  background: "#fff",
  borderRadius: 24,
  padding: 32,
  display: "grid",
  gap: 16,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(2rem, 3vw, 3rem)",
  lineHeight: 1.05,
  fontWeight: 800,
  color: "#171717",
};

const textStyle: React.CSSProperties = {
  margin: 0,
  color: "#5d554a",
  lineHeight: 1.8,
  fontSize: 15,
  maxWidth: 820,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#171717",
  marginTop: 4,
};

const gridTwoStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const gridOneStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 16,
};

const fieldWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#5d554a",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  borderRadius: 14,
  border: "1px solid #ddd3c5",
  padding: "0 14px",
  fontSize: 15,
  color: "#171717",
  background: "#fff",
};

const paymentPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: 18,
  border: "1px solid #eee5d9",
  background: "#fcfbf8",
};

const paymentNoticeStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #e7ddcf",
  background: "#fff",
  color: "#6b6256",
  fontSize: 14,
};

const submitButtonStyle: React.CSSProperties = {
  minHeight: 54,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontSize: 15,
  fontWeight: 800,
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  padding: "0 20px",
  borderRadius: 999,
  background: "#171717",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  border: "1px solid #171717",
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  padding: "0 20px",
  borderRadius: 999,
  background: "#fff",
  color: "#171717",
  textDecoration: "none",
  fontWeight: 800,
  border: "1px solid #ddd3c5",
};

const summaryItemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "72px 1fr",
  gap: 12,
  alignItems: "center",
};

const summaryImageWrapStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 14,
  overflow: "hidden",
  background: "#f7f4ef",
};

const summaryImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const summaryTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "#171717",
};

const summaryVariantStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7b7367",
  marginTop: 4,
};

const summaryMetaStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#5d554a",
  marginTop: 6,
};

const totalsWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  paddingTop: 16,
  borderTop: "1px solid #eee5d9",
};

const totalRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#5d554a",
  fontSize: 15,
};

const grandTotalRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#171717",
  fontSize: 18,
  fontWeight: 800,
  paddingTop: 8,
};

const errorStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #f1c7c7",
  background: "#fff4f4",
  color: "#9b2c2c",
  fontSize: 14,
  fontWeight: 600,
};