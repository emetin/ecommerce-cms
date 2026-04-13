"use client";

import { useState } from "react";

export default function ApplyForAccountPage() {
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    country: "",
    business_type: "",
    tax_id: "",
    website: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(name: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/customer-applications/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Application failed.");
      }

      setMessage(data.message || "Application submitted successfully.");

      setForm({
        company_name: "",
        contact_name: "",
        email: "",
        phone: "",
        country: "",
        business_type: "",
        tax_id: "",
        website: "",
        notes: "",
      });
    } catch (error) {
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
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 840,
          margin: "0 auto",
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
            marginBottom: 10,
          }}
        >
          B2B Account Application
        </div>

        <h1
          style={{
            fontSize: 40,
            lineHeight: 1.08,
            margin: "0 0 12px",
            fontWeight: 800,
            color: "#171717",
          }}
        >
          Apply for a wholesale customer account
        </h1>

        <p
          style={{
            margin: "0 0 28px",
            color: "#665d52",
            lineHeight: 1.8,
            fontSize: 15,
            maxWidth: 760,
          }}
        >
          Submit your company information to request access to the B2B customer
          portal. Approved customers can log in, view account-based pricing, and
          place orders online.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
          <div style={grid2Style}>
            <div>
              <label style={labelStyle}>Company name</label>
              <input
                value={form.company_name}
                onChange={(e) => updateField("company_name", e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Contact name</label>
              <input
                value={form.contact_name}
                onChange={(e) => updateField("contact_name", e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={grid2Style}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                style={inputStyle}
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
              />
            </div>

            <div>
              <label style={labelStyle}>Business type</label>
              <input
                value={form.business_type}
                onChange={(e) => updateField("business_type", e.target.value)}
                style={inputStyle}
                placeholder="Hotel, Distributor, Retailer, Reseller"
              />
            </div>
          </div>

          <div style={grid2Style}>
            <div>
              <label style={labelStyle}>Tax ID</label>
              <input
                value={form.tax_id}
                onChange={(e) => updateField("tax_id", e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Website</label>
              <input
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              style={textareaStyle}
              placeholder="Tell us about your company, expected order volume, or project scope."
            />
          </div>

          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>

        {message ? (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 16,
              background: "#f8f5ef",
              border: "1px solid #e5ddd2",
              color: "#171717",
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        ) : null}
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
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};