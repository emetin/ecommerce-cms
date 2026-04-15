"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "../cart/CartContext";
import { formatMoney } from "../../lib/money";

type OrderApiResponse = {
  ok: boolean;
  error?: string;
  order?: {
    id: string;
    order_number: string;
    email: string;
    first_name: string;
    last_name: string;
    company: string;
    phone: string;
    note: string;
    grand_total: string;
    item_count: string;
    status: string;
  };
  items?: any[];
};

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function OrderRequestPageClient() {
  const router = useRouter();
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
    note: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const items = cart?.items || [];
  const subtotal = Number(cart?.totals?.subtotal || 0);
  const itemCount = Number(cart?.totals?.item_count || 0);

  const canSubmit = useMemo(() => {
    return Boolean(form.email.trim()) && items.length > 0 && !submitting;
  }, [form.email, items.length, submitting]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = (await parseJsonSafe(response)) as OrderApiResponse | null;

      if (!response.ok || !data?.ok || !data.order?.order_number) {
        throw new Error(data?.error || "Failed to submit order request.");
      }

      router.push(
        `/order-success/${encodeURIComponent(data.order.order_number)}`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit order request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!items.length && !isLoading) {
    return (
      <div style={pageStyle}>
        <div style={emptyBoxStyle}>
          <h1 style={titleStyle}>Order Request</h1>
          <p style={textStyle}>
            Your cart is empty. Add products before submitting an order request.
          </p>

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
        <h1 style={titleStyle}>Order Request</h1>
        <p style={textStyle}>
          Submit your cart as a B2B order request. Our team will review your
          items and follow up with pricing, lead time, and fulfillment details.
        </p>
      </div>

      <div style={layoutStyle}>
        <form onSubmit={onSubmit} style={formCardStyle}>
          <div style={sectionTitleStyle}>Contact Information</div>

          <div style={gridTwoStyle}>
            <Field
              label="First Name"
              value={form.first_name}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, first_name: value }))
              }
            />
            <Field
              label="Last Name"
              value={form.last_name}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, last_name: value }))
              }
            />
          </div>

          <div style={gridTwoStyle}>
            <Field
              label="Email"
              value={form.email}
              required
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

          <div style={sectionTitleStyle}>Project Details</div>

          <div style={gridTwoStyle}>
            <Field
              label="Country"
              value={form.country}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, country: value }))
              }
            />
            <Field
              label="City"
              value={form.city}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, city: value }))
              }
            />
          </div>

          <div style={gridOneStyle}>
            <Field
              label="Address Line 1"
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

          <div style={gridOneStyle}>
            <label style={labelStyle}>Project Note</label>
            <textarea
              value={form.note}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, note: e.target.value }))
              }
              rows={6}
              style={textareaStyle}
              placeholder="Share hotel name, project scope, target quantities, requested delivery timeline, or any additional notes."
            />
          </div>

          {error ? <div style={errorStyle}>{error}</div> : null}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...submitButtonStyle,
              opacity: canSubmit ? 1 : 0.65,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Submitting..." : "Submit Order Request"}
          </button>
        </form>

        <aside style={summaryCardStyle}>
          <div style={sectionTitleStyle}>Cart Summary</div>

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

          <div style={{ marginTop: 18 }}>
            <Link href="/cart" style={secondaryLinkStyle}>
              Back to Cart
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

const textareaStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #ddd3c5",
  padding: "14px",
  fontSize: 15,
  color: "#171717",
  background: "#fff",
  resize: "vertical",
  minHeight: 140,
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