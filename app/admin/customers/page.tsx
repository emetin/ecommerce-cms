"use client";

import { useEffect, useState } from "react";

type CustomerItem = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  status: string;
  customer_code: string;
  price_tier: string;
  currency: string;
  shipping_terms: string;
  payment_terms: string;
  tax_exempt: string;
  approved_at: string;
  created_at: string;
  updated_at: string;
};

type ResetResult = {
  customerId: string;
  companyName: string;
  email: string;
  temporaryPassword: string;
};

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
  const raw = String(value || "").trim().toLowerCase();

  if (raw === "active") {
    return {
      background: "#eef8f0",
      color: "#2f7d62",
      border: "1px solid rgba(47,125,98,0.18)",
    };
  }

  return {
    background: "#fff4f2",
    color: "#a54a3f",
    border: "1px solid rgba(165,74,63,0.18)",
  };
}

function generateEmailTemplate(
  contactName: string,
  email: string,
  password: string
) {
  return `Dear ${contactName || "Partner"},

We are pleased to inform you that your company has been successfully approved as a B2B partner of Globaltex Fine Linens.

You may now access your dedicated customer portal using the credentials below:

Portal Access: https://www.globaltexusa.com/portal-login
Email: ${email}
Temporary Password: ${password}

Through your account, you will be able to:
- access your assigned wholesale pricing structure
- explore our hospitality collections
- create and submit order requests
- manage your account details efficiently

As a trusted supplier to luxury hotels, resorts, and premium residences, Globaltex Fine Linens is committed to delivering exceptional quality, consistency, and service tailored to your operational needs.

For security reasons, we recommend updating your password upon your first login.

If you require any assistance or would like to discuss custom products, embroidery, or bulk project requirements, our team will be delighted to support you.

We look forward to building a long-term partnership with your organization.

Warm regards,
Globaltex Fine Linens
customerservice@globaltexusa.com
https://www.globaltexusa.com/`;
}

export default function AdminCustomersPage() {
  const [items, setItems] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [resetLoadingId, setResetLoadingId] = useState("");
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/admin/customers/list", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load customers.");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function handleResetPassword(item: CustomerItem) {
    try {
      setResetLoadingId(item.id);
      setResetResult(null);
      setGeneratedEmail("");

      const response = await fetch("/api/admin/customers/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: item.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to reset password.");
      }

      const nextEmail = data?.customer?.email || item.email;
      const nextPassword = data?.temporaryPassword || "";

      setResetResult({
        customerId: data?.customer?.id || item.id,
        companyName: data?.customer?.companyName || item.company_name,
        email: nextEmail,
        temporaryPassword: nextPassword,
      });

      setGeneratedEmail(
        generateEmailTemplate(
          item.contact_name,
          nextEmail,
          nextPassword
        )
      );

      await loadCustomers();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setResetLoadingId("");
    }
  }

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(generatedEmail);
      alert("Email copied successfully.");
    } catch {
      alert("Failed to copy email.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <h1 style={titleStyle}>Customers</h1>
        <p style={subtitleStyle}>
          Review approved B2B customer accounts, pricing tiers, account terms,
          and generate temporary passwords with a ready-to-send Globaltex Fine
          Linens onboarding email.
        </p>
      </div>

      {resetResult ? (
        <div style={successBoxStyle}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            Temporary password generated
          </div>
          <div style={{ lineHeight: 1.8 }}>
            <div>
              <strong>Company:</strong> {resetResult.companyName}
            </div>
            <div>
              <strong>Email:</strong> {resetResult.email}
            </div>
            <div>
              <strong>Temporary Password:</strong> {resetResult.temporaryPassword}
            </div>
          </div>
        </div>
      ) : null}

      {generatedEmail ? (
        <div style={emailBoxStyle}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#171717" }}>
            Ready Email
          </div>

          <textarea
            value={generatedEmail}
            readOnly
            style={emailTextareaStyle}
          />

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleCopyEmail}
              style={primaryButtonStyle}
            >
              Copy Email
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div style={cardStyle}>Loading...</div>
      ) : errorMessage ? (
        <div style={errorBoxStyle}>{errorMessage}</div>
      ) : items.length === 0 ? (
        <div style={cardStyle}>No customers found.</div>
      ) : (
        <div style={listGridStyle}>
          {items.map((item) => (
            <div key={item.id} style={cardStyle}>
              <div style={cardTopStyle}>
                <div>
                  <div style={companyTitleStyle}>{item.company_name || "-"}</div>
                  <div style={contactStyle}>
                    {item.contact_name || "-"} • {item.email || "-"}
                  </div>
                </div>

                <div
                  style={{
                    ...statusPillStyle,
                    ...getStatusStyle(item.status),
                  }}
                >
                  {item.status || "inactive"}
                </div>
              </div>

              <div style={metaGridStyle}>
                <div>
                  <div style={metaLabelStyle}>Customer Code</div>
                  <div style={metaValueStyle}>{item.customer_code || "-"}</div>
                </div>

                <div>
                  <div style={metaLabelStyle}>Price Tier</div>
                  <div style={metaValueStyle}>{item.price_tier || "-"}</div>
                </div>

                <div>
                  <div style={metaLabelStyle}>Currency</div>
                  <div style={metaValueStyle}>{item.currency || "-"}</div>
                </div>

                <div>
                  <div style={metaLabelStyle}>Shipping Terms</div>
                  <div style={metaValueStyle}>{item.shipping_terms || "-"}</div>
                </div>

                <div>
                  <div style={metaLabelStyle}>Payment Terms</div>
                  <div style={metaValueStyle}>{item.payment_terms || "-"}</div>
                </div>

                <div>
                  <div style={metaLabelStyle}>Tax Exempt</div>
                  <div style={metaValueStyle}>{item.tax_exempt || "-"}</div>
                </div>

                <div>
                  <div style={metaLabelStyle}>Approved</div>
                  <div style={metaValueStyle}>{formatDate(item.approved_at)}</div>
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

              <div style={actionsWrapStyle}>
                <button
                  type="button"
                  onClick={() => handleResetPassword(item)}
                  disabled={resetLoadingId === item.id}
                  style={primaryButtonStyle}
                >
                  {resetLoadingId === item.id
                    ? "Generating..."
                    : "Generate Temporary Password"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

const companyTitleStyle: React.CSSProperties = {
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
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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

const actionsWrapStyle: React.CSSProperties = {
  marginTop: 18,
  paddingTop: 16,
  borderTop: "1px solid #eee5d9",
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
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
};

const successBoxStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
};

const emailBoxStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 18,
  background: "#f8f5ef",
  border: "1px solid #e5ddd2",
  display: "grid",
  gap: 12,
};

const emailTextareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 320,
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  padding: 14,
  fontSize: 14,
  lineHeight: 1.7,
  background: "#fff",
  resize: "vertical",
  outline: "none",
};

const errorBoxStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
};