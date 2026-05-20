"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "../cart/CartContext";
import { formatMoney } from "../../lib/money";

type OrderCreateApiResponse = {
  ok: boolean;
  error?: string;
  next_path?: string;
  order?: {
    order_number?: string;
  };
};

type CustomerMeResponse = {
  ok: boolean;
  authenticated?: boolean;
  customer?: {
    customerId?: string;
    customerUserId?: string;
    email?: string;
    companyName?: string;
    contactName?: string;
    priceTier?: string;
    currency?: string;
  } | null;
};

type CustomerProfileResponse = {
  ok: boolean;
  authenticated?: boolean;
  customer?: {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    company?: string;
    phone?: string;
    country?: string;
    city?: string;
    address_line_1?: string;
    address_line_2?: string;
    postal_code?: string;
    status?: string;
  } | null;
};

type CartItem = {
  id: string;
  product_title?: string;
  variant_title?: string;
  image?: string;
  quantity?: number | string;
  unit_price?: number | string;
  line_total?: number | string;
  sku?: string;
};

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function splitContactName(value: unknown) {
  const fullName = normalizeText(value);
  if (!fullName) {
    return {
      first_name: "",
      last_name: "",
    };
  }

  const parts = fullName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return {
      first_name: parts[0],
      last_name: "",
    };
  }

  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
}

function isTechnicalCartError(message: string) {
  const normalized = String(message || "").toLowerCase();

  return (
    normalized.includes("cart not found") ||
    normalized.includes("cart token not found") ||
    normalized.includes("cart row could not be found")
  );
}

export default function CheckoutPageClient() {
  const { cart, isBootstrapping, error: cartError, refreshCart } = useCart();

  const [cartRequested, setCartRequested] = useState(false);

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

  const [autofillApplied, setAutofillApplied] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const items = useMemo(() => {
    return Array.isArray(cart?.items) ? (cart.items as CartItem[]) : [];
  }, [cart]);

  const subtotal = Number(cart?.totals?.subtotal || 0);
  const itemCount = Number(cart?.totals?.item_count || 0);

  const visibleCartError =
    cartError && !isTechnicalCartError(cartError) ? cartError : "";

  useEffect(() => {
    let active = true;

    async function loadCart() {
      try {
        await refreshCart();
      } catch {
        // Cart errors are already handled by CartContext.
      } finally {
        if (active) {
          setCartRequested(true);
        }
      }
    }

    void loadCart();

    return () => {
      active = false;
    };
  }, [refreshCart]);

  useEffect(() => {
    let active = true;

    async function loadCustomerProfile() {
      try {
        const meResponse = await fetch("/api/customer-auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const meData = (await parseJsonSafe(
          meResponse
        )) as CustomerMeResponse | null;

        if (!active) return;

        if (!meResponse.ok || !meData?.authenticated || !meData.customer) {
          return;
        }

        const profileResponse = await fetch("/api/customer-auth/profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const profileData = (await parseJsonSafe(
          profileResponse
        )) as CustomerProfileResponse | null;

        if (!active) return;

        if (profileResponse.ok && profileData?.ok && profileData.customer) {
          const customer = profileData.customer;

          setForm((prev) => ({
            ...prev,
            email: prev.email || customer.email || "",
            first_name: prev.first_name || customer.first_name || "",
            last_name: prev.last_name || customer.last_name || "",
            company: prev.company || customer.company || "",
            phone: prev.phone || customer.phone || "",
            country: prev.country || customer.country || "",
            city: prev.city || customer.city || "",
            address_line_1:
              prev.address_line_1 || customer.address_line_1 || "",
            address_line_2:
              prev.address_line_2 || customer.address_line_2 || "",
            postal_code: prev.postal_code || customer.postal_code || "",
          }));

          setAutofillApplied(true);
          return;
        }

        const sessionCustomer = meData.customer;
        const splitName = splitContactName(sessionCustomer.contactName);

        setForm((prev) => ({
          ...prev,
          email: prev.email || sessionCustomer.email || "",
          first_name: prev.first_name || splitName.first_name,
          last_name: prev.last_name || splitName.last_name,
          company: prev.company || sessionCustomer.companyName || "",
        }));

        setAutofillApplied(true);
      } catch {
        // Customer profile is optional for guest quote requests.
      } finally {
        if (active) {
          setLoadingCustomer(false);
        }
      }
    }

    void loadCustomerProfile();

    return () => {
      active = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return (
      items.length > 0 &&
      Boolean(normalizeEmail(form.email)) &&
      Boolean(normalizeText(form.first_name)) &&
      Boolean(normalizeText(form.last_name)) &&
      Boolean(normalizeText(form.company)) &&
      Boolean(normalizeText(form.phone)) &&
      Boolean(normalizeText(form.country)) &&
      Boolean(normalizeText(form.city)) &&
      Boolean(normalizeText(form.address_line_1))
    );
  }, [items.length, form]);

  async function submitQuoteRequest() {
    const response = await fetch("/api/orders/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        email: normalizeEmail(form.email),
        first_name: normalizeText(form.first_name),
        last_name: normalizeText(form.last_name),
        company: normalizeText(form.company),
        phone: normalizeText(form.phone),
        country: normalizeText(form.country),
        city: normalizeText(form.city),
        address_line_1: normalizeText(form.address_line_1),
        address_line_2: normalizeText(form.address_line_2),
        postal_code: normalizeText(form.postal_code),
        note: normalizeText(form.note),
      }),
    });

    const data = (await parseJsonSafe(response)) as OrderCreateApiResponse | null;

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Failed to submit quote request.");
    }

    return data;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isBootstrapping || !cartRequested) {
      setError("Quote cart is still loading. Please try again in a moment.");
      return;
    }

    if (!items.length) {
      setError("Your quote cart is empty.");
      return;
    }

    if (!canSubmit) {
      setError("Please complete all required B2B quote request fields.");
      return;
    }

    try {
      setSubmitting(true);

      const data = await submitQuoteRequest();

      await refreshCart().catch(() => undefined);

      const nextPath =
        data?.next_path ||
        (data?.order?.order_number
          ? `/order-success?order=${encodeURIComponent(data.order.order_number)}`
          : "/order-success");

      window.location.href = nextPath;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit quote request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!cartRequested || isBootstrapping) {
    return (
      <div style={pageStyle}>
        <div style={emptyBoxStyle}>
          <h1 style={titleStyle}>Submit Quote Request</h1>
          <p style={textStyle}>Loading your quote cart...</p>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div style={pageStyle}>
        <div style={emptyBoxStyle}>
          <div style={eyebrowStyle}>B2B Quote Request</div>

          <h1 style={titleStyle}>Your Quote Cart Is Empty</h1>

          <p style={textStyle}>
            Add products to your quote cart before submitting a wholesale
            request.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/collections" style={primaryLinkStyle}>
              Browse Collections
            </Link>

            <Link href="/cart" style={secondaryLinkStyle}>
              Back to Quote Cart
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={eyebrowStyle}>B2B Quote Request</div>

        <h1 style={titleStyle}>Submit Quote Request</h1>

        <p style={textStyle}>
          Complete your company and shipping details. This is not an online
          payment checkout. Your request will be reviewed by the Globaltex Fine
          Linens sales team for final pricing, availability, freight, and payment
          terms.
        </p>

        {!loadingCustomer && autofillApplied ? (
          <div style={autofillNoticeStyle}>
            Saved profile details were loaded automatically.
          </div>
        ) : null}
      </div>

      {visibleCartError ? <div style={errorStyle}>{visibleCartError}</div> : null}

      <div className="checkout-layout" style={responsiveLayoutStyle}>
        <form onSubmit={onSubmit} style={formCardStyle}>
          <div style={sectionTitleStyle}>Contact Information</div>

          <div className="checkout-grid-two" style={responsiveGridTwoStyle}>
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

          <div className="checkout-grid-two" style={responsiveGridTwoStyle}>
            <Field
              label="Email"
              required
              type="email"
              value={form.email}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, email: value }))
              }
            />

            <Field
              label="Phone"
              required
              value={form.phone}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, phone: value }))
              }
            />
          </div>

          <div style={gridOneStyle}>
            <Field
              label="Company"
              required
              value={form.company}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, company: value }))
              }
            />
          </div>

          <div style={sectionTitleStyle}>Shipping Address</div>

          <div className="checkout-grid-two" style={responsiveGridTwoStyle}>
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

          <div className="checkout-grid-two" style={responsiveGridTwoStyle}>
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

          <div style={sectionTitleStyle}>Request Note</div>

          <div style={gridOneStyle}>
            <label style={labelStyle}>Note</label>

            <textarea
              value={form.note}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, note: event.target.value }))
              }
              rows={4}
              style={textareaStyle}
              placeholder="Add any hotel, hospitality, delivery, deadline, or project detail here."
            />
          </div>

          <div style={quoteNoticeStyle}>
            By submitting this form, you are sending a quote request. No online
            payment will be collected at this stage.
          </div>

          {error ? <div style={errorStyle}>{error}</div> : null}

          <div style={submitActionsStyle}>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              style={{
                ...submitButtonStyle,
                opacity: !canSubmit || submitting ? 0.65 : 1,
                cursor: !canSubmit || submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting Request..." : "Submit Quote Request"}
            </button>

            <Link href="/cart" style={secondaryLinkStyle}>
              Back to Quote Cart
            </Link>
          </div>
        </form>

        <aside style={summaryCardStyle}>
          <div style={sectionTitleStyle}>Quote Summary</div>

          <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
            {items.map((item) => {
              const quantity = Number(item.quantity || 1);
              const unitPrice = Number(item.unit_price || 0);
              const lineTotal = Number(
                item.line_total || unitPrice * quantity || 0
              );

              return (
                <div key={item.id} style={summaryItemStyle}>
                  <div style={summaryImageWrapStyle}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.product_title || "Product"}
                        loading="lazy"
                        decoding="async"
                        style={summaryImageStyle}
                      />
                    ) : (
                      <div style={summaryPlaceholderStyle}>No Image</div>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={summaryTitleStyle}>
                      {item.product_title || "Product"}
                    </div>

                    {item.variant_title ? (
                      <div style={summaryVariantStyle}>
                        {item.variant_title}
                      </div>
                    ) : null}

                    {item.sku ? (
                      <div style={summaryVariantStyle}>SKU: {item.sku}</div>
                    ) : null}

                    <div style={summaryMetaStyle}>
                      Qty: {quantity} · {formatMoney(lineTotal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={totalsWrapStyle}>
            <div style={totalRowStyle}>
              <span>Items</span>
              <span>{itemCount}</span>
            </div>

            <div style={totalRowStyle}>
              <span>Estimated Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>

            <div style={grandTotalRowStyle}>
              <span>Estimated Total</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
          </div>

          <div style={summaryNoticeStyle}>
            Final quote may change based on availability, freight, lead time,
            payment terms, and approved wholesale pricing.
          </div>
        </aside>
      </div>

      <style jsx>{`
        @media (max-width: 980px) {
          .checkout-layout {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 720px) {
          .checkout-grid-two {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  value,
  required,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  required?: boolean;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={fieldWrapStyle}>
      <label style={labelStyle}>
        {label}
        {required ? " *" : ""}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
  marginBottom: 12,
};

const responsiveLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 390px",
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
  fontWeight: 850,
  color: "#171717",
};

const textStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#5d554a",
  lineHeight: 1.8,
  fontSize: 15,
  maxWidth: 840,
};

const autofillNoticeStyle: React.CSSProperties = {
  marginTop: 16,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid #d9d7a8",
  background: "#f8f5cf",
  color: "#5e5722",
  fontSize: 13,
  fontWeight: 700,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 850,
  color: "#171717",
  marginTop: 4,
};

const responsiveGridTwoStyle: React.CSSProperties = {
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
  fontWeight: 850,
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
  padding: 14,
  fontSize: 15,
  color: "#171717",
  background: "#fff",
  resize: "vertical",
  minHeight: 120,
};

const quoteNoticeStyle: React.CSSProperties = {
  padding: "13px 14px",
  borderRadius: 16,
  border: "1px solid #eadbb5",
  background: "#fff8e7",
  color: "#6b5530",
  fontSize: 14,
  lineHeight: 1.7,
};

const submitActionsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
};

const submitButtonStyle: React.CSSProperties = {
  minHeight: 54,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontSize: 15,
  fontWeight: 850,
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
  fontWeight: 850,
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

const summaryPlaceholderStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  color: "#9b9288",
  fontSize: 11,
  fontWeight: 700,
};

const summaryTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "#171717",
  lineHeight: 1.35,
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
  fontWeight: 850,
  paddingTop: 8,
};

const summaryNoticeStyle: React.CSSProperties = {
  marginTop: 18,
  padding: "13px 14px",
  borderRadius: 16,
  background: "#f8f5ef",
  border: "1px solid #eee5d9",
  color: "#6b6256",
  fontSize: 13,
  lineHeight: 1.7,
};

const errorStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #f1c7c7",
  background: "#fff4f4",
  color: "#9b2c2c",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.6,
};