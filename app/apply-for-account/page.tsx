"use client";

import { useMemo, useState } from "react";

type FormState = {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  country: string;
  business_type: string;
  tax_id: string;
  website: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  country: "",
  business_type: "",
  tax_id: "",
  website: "",
  notes: "",
};

function normalizeText(value: string) {
  return String(value || "").trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidWebsite(value: string) {
  if (!value) return true;
  return /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(value);
}

export default function ApplyForAccountPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  function updateField(name: keyof FormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  const validationError = useMemo(() => {
    const companyName = normalizeText(form.company_name);
    const contactName = normalizeText(form.contact_name);
    const email = normalizeText(form.email);
    const website = normalizeText(form.website);

    if (!companyName) return "Company name is required.";
    if (!contactName) return "Contact name is required.";
    if (!email) return "Email is required.";
    if (!isValidEmail(email)) return "Please enter a valid email address.";
    if (website && !isValidWebsite(website)) {
      return "Please enter a valid website URL.";
    }

    return "";
  }, [form]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (validationError) {
      setMessageType("error");
      setMessage(validationError);
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const response = await fetch("/api/customer-applications/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_name: normalizeText(form.company_name),
          contact_name: normalizeText(form.contact_name),
          email: normalizeText(form.email).toLowerCase(),
          phone: normalizeText(form.phone),
          country: normalizeText(form.country),
          business_type: normalizeText(form.business_type),
          tax_id: normalizeText(form.tax_id),
          website: normalizeText(form.website),
          notes: normalizeText(form.notes),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Application failed.");
      }

      setMessageType("success");
      setMessage(
        data.message ||
          "Application submitted successfully. Our team will review your company information and contact you after approval."
      );
      setForm(INITIAL_FORM);
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f4ee",
        padding: "44px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          display: "grid",
          gap: 22,
        }}
      >
        <section
          style={{
            background: "#fff",
            border: "1px solid #e6ddd0",
            borderRadius: 28,
            padding: 32,
            boxShadow: "0 10px 30px rgba(23,23,23,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#7a7166",
              fontWeight: 800,
              marginBottom: 12,
            }}
          >
            B2B Account Application
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              lineHeight: 1.06,
              margin: "0 0 14px",
              fontWeight: 800,
              color: "#171717",
              maxWidth: 760,
            }}
          >
            Apply for a wholesale customer account
          </h1>

          <p
            style={{
              margin: "0 0 18px",
              color: "#665d52",
              lineHeight: 1.85,
              fontSize: 15,
              maxWidth: 820,
            }}
          >
            Submit your company information to request access to the Globaltex
            Fine Linens B2B customer portal. Approved customers can view
            account-based pricing, review hospitality collections, and submit
            order requests online.
          </p>

          <div style={benefitsGridStyle}>
            <div style={benefitCardStyle}>
              <div style={benefitTitleStyle}>Account Pricing</div>
              <div style={benefitTextStyle}>
                Access your assigned pricing tier after approval.
              </div>
            </div>

            <div style={benefitCardStyle}>
              <div style={benefitTitleStyle}>Draft Orders</div>
              <div style={benefitTextStyle}>
                Build order requests before final submission.
              </div>
            </div>

            <div style={benefitCardStyle}>
              <div style={benefitTitleStyle}>Hospitality Workflow</div>
              <div style={benefitTextStyle}>
                Suitable for hotels, projects, distributors, and resellers.
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e6ddd0",
            borderRadius: 28,
            padding: 32,
            boxShadow: "0 10px 30px rgba(23,23,23,0.05)",
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
            <div style={grid2Style}>
              <div>
                <label style={labelStyle}>Company name *</label>
                <input
                  value={form.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  style={inputStyle}
                  placeholder="Company legal name"
                />
              </div>

              <div>
                <label style={labelStyle}>Contact name *</label>
                <input
                  value={form.contact_name}
                  onChange={(e) => updateField("contact_name", e.target.value)}
                  style={inputStyle}
                  placeholder="Full name"
                />
              </div>
            </div>

            <div style={grid2Style}>
              <div>
                <label style={labelStyle}>Business email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  style={inputStyle}
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  style={inputStyle}
                  placeholder="+1 ..."
                />
              </div>
            </div>

            <div style={grid2Style}>
              <div>
                <label style={labelStyle}>Country</label>
                <input
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  style={inputStyle}
                  placeholder="United States"
                />
              </div>

              <div>
                <label style={labelStyle}>Business type</label>
                <input
                  value={form.business_type}
                  onChange={(e) => updateField("business_type", e.target.value)}
                  style={inputStyle}
                  placeholder="Hotel, Resort, Distributor, Retailer"
                />
              </div>
            </div>

            <div style={grid2Style}>
              <div>
                <label style={labelStyle}>Tax ID / Resale Certificate</label>
                <input
                  value={form.tax_id}
                  onChange={(e) => updateField("tax_id", e.target.value)}
                  style={inputStyle}
                  placeholder="Optional"
                />
              </div>

              <div>
                <label style={labelStyle}>Website</label>
                <input
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  style={inputStyle}
                  placeholder="https://yourcompany.com"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                style={textareaStyle}
                placeholder="Tell us about your business, target order volume, market, or project scope."
              />
            </div>

            <div style={footerRowStyle}>
              <div style={helperTextStyle}>
                Fields marked with * are required.
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...primaryButtonStyle,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>

          {message ? (
            <div
              style={
                messageType === "success" ? successMessageStyle : errorMessageStyle
              }
            >
              {message}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

const grid2Style: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 800,
  fontSize: 14,
  color: "#171717",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 54,
  borderRadius: 16,
  border: "1px solid #dcd1c0",
  background: "#fcfbf8",
  padding: "0 16px",
  fontSize: 15,
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 140,
  borderRadius: 16,
  border: "1px solid #dcd1c0",
  background: "#fcfbf8",
  padding: "14px 16px",
  fontSize: 15,
  outline: "none",
  resize: "vertical",
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 54,
  padding: "0 22px",
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
};

const benefitsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
  marginTop: 12,
};

const benefitCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid #e8dfd2",
  background: "#faf8f4",
  padding: 16,
};

const benefitTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#171717",
  marginBottom: 6,
  fontSize: 14,
};

const benefitTextStyle: React.CSSProperties = {
  color: "#6f6559",
  lineHeight: 1.7,
  fontSize: 13,
};

const footerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
};

const helperTextStyle: React.CSSProperties = {
  color: "#7a7166",
  fontSize: 13,
  lineHeight: 1.6,
};

const successMessageStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 16,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontWeight: 700,
};

const errorMessageStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 16,
  background: "#fff3f3",
  border: "1px solid #efcaca",
  color: "#8d2f2f",
  fontWeight: 700,
};