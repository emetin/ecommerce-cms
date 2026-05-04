"use client";

import { FormEvent, useState } from "react";

type FormState = {
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  country: string;
  city: string;
  address_line_1: string;
  address_line_2: string;
  postal_code: string;
  status: string;
  tax_exempt: string;
  price_tier: string;
  currency: string;
  customer_code: string;
};

const INITIAL_FORM: FormState = {
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
  status: "active",
  tax_exempt: "false",
  price_tier: "standard",
  currency: "USD",
  customer_code: "",
};

function normalizeText(value: string) {
  return String(value || "").trim();
}

function generateEmailTemplate(input: {
  name: string;
  email: string;
  password: string;
}) {
  return `Dear ${input.name || "Partner"},

Your Globaltex Fine Linens customer portal account has been created.

Portal Access: https://www.globaltexusa.com/portal-login
Email: ${input.email}
Temporary Password: ${input.password}

For security reasons, you will be asked to create your own password after your first login.

Through your account, you can:
- access your assigned customer pricing
- review hospitality collections
- prepare and submit order requests
- manage your B2B purchasing workflow

Warm regards,
Globaltex Fine Linens
customerservice@globaltexusa.com
https://www.globaltexusa.com/`;
}

export default function NewCustomerPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");

  function updateField(name: keyof FormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      setTemporaryPassword("");
      setGeneratedEmail("");

      const response = await fetch("/api/admin/customers/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizeText(form.email).toLowerCase(),
          first_name: normalizeText(form.first_name),
          last_name: normalizeText(form.last_name),
          company: normalizeText(form.company),
          phone: normalizeText(form.phone),
          country: normalizeText(form.country),
          city: normalizeText(form.city),
          address_line_1: normalizeText(form.address_line_1),
          address_line_2: normalizeText(form.address_line_2),
          postal_code: normalizeText(form.postal_code),
          status: normalizeText(form.status),
          tax_exempt: normalizeText(form.tax_exempt),
          price_tier: normalizeText(form.price_tier),
          currency: normalizeText(form.currency),
          customer_code: normalizeText(form.customer_code),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to create customer.");
      }

      const password = data?.temporaryPassword || "";
      const email = data?.customer?.email || form.email;
      const name = [form.first_name, form.last_name].filter(Boolean).join(" ");

      setTemporaryPassword(password);
      setGeneratedEmail(
        generateEmailTemplate({
          name,
          email,
          password,
        })
      );

      setSuccessMessage("Customer created successfully.");
      setForm(INITIAL_FORM);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      alert("Copied successfully.");
    } catch {
      alert("Failed to copy.");
    }
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>New Customer</h1>
          <p style={subtitleStyle}>
            Create a customer account manually and generate a temporary password.
          </p>
        </div>

        <a href="/admin/customers" style={secondaryButtonStyle}>
          Back to Customers
        </a>
      </div>

      <form onSubmit={handleSubmit} style={cardStyle}>
        <div style={sectionTitleStyle}>Account Information</div>

        <div style={grid2Style}>
          <Field label="Email *">
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              style={inputStyle}
              placeholder="customer@company.com"
            />
          </Field>

          <Field label="Company">
            <input
              value={form.company}
              onChange={(event) => updateField("company", event.target.value)}
              style={inputStyle}
              placeholder="Company name"
            />
          </Field>
        </div>

        <div style={grid2Style}>
          <Field label="First Name">
            <input
              value={form.first_name}
              onChange={(event) => updateField("first_name", event.target.value)}
              style={inputStyle}
              placeholder="First name"
            />
          </Field>

          <Field label="Last Name">
            <input
              value={form.last_name}
              onChange={(event) => updateField("last_name", event.target.value)}
              style={inputStyle}
              placeholder="Last name"
            />
          </Field>
        </div>

        <div style={grid3Style}>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              style={inputStyle}
              placeholder="+1 ..."
            />
          </Field>

          <Field label="Country">
            <input
              value={form.country}
              onChange={(event) => updateField("country", event.target.value)}
              style={inputStyle}
              placeholder="United States"
            />
          </Field>

          <Field label="City">
            <input
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              style={inputStyle}
              placeholder="Miami"
            />
          </Field>
        </div>

        <div style={grid2Style}>
          <Field label="Address Line 1">
            <input
              value={form.address_line_1}
              onChange={(event) =>
                updateField("address_line_1", event.target.value)
              }
              style={inputStyle}
              placeholder="Street address"
            />
          </Field>

          <Field label="Address Line 2">
            <input
              value={form.address_line_2}
              onChange={(event) =>
                updateField("address_line_2", event.target.value)
              }
              style={inputStyle}
              placeholder="Suite, unit, etc."
            />
          </Field>
        </div>

        <div style={grid3Style}>
          <Field label="Postal Code">
            <input
              value={form.postal_code}
              onChange={(event) =>
                updateField("postal_code", event.target.value)
              }
              style={inputStyle}
              placeholder="Postal code"
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
              style={inputStyle}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </Field>

          <Field label="Tax Exempt">
            <select
              value={form.tax_exempt}
              onChange={(event) =>
                updateField("tax_exempt", event.target.value)
              }
              style={inputStyle}
            >
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          </Field>
        </div>

        <div style={grid3Style}>
          <Field label="Price Tier">
            <select
              value={form.price_tier}
              onChange={(event) =>
                updateField("price_tier", event.target.value)
              }
              style={inputStyle}
            >
              <option value="standard">standard</option>
              <option value="wholesale">wholesale</option>
              <option value="distributor">distributor</option>
              <option value="vip">vip</option>
            </select>
          </Field>

          <Field label="Currency">
            <select
              value={form.currency}
              onChange={(event) => updateField("currency", event.target.value)}
              style={inputStyle}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="TRY">TRY</option>
            </select>
          </Field>

          <Field label="Customer Code">
            <input
              value={form.customer_code}
              onChange={(event) =>
                updateField("customer_code", event.target.value)
              }
              style={inputStyle}
              placeholder="Auto if blank"
            />
          </Field>
        </div>

        <div style={formFooterStyle}>
          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? "Creating..." : "Create Customer"}
          </button>
        </div>
      </form>

      {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}
      {successMessage ? (
        <div style={successBoxStyle}>{successMessage}</div>
      ) : null}

      {temporaryPassword ? (
        <div style={resultCardStyle}>
          <div style={sectionTitleStyle}>Temporary Password</div>
          <div style={passwordBoxStyle}>{temporaryPassword}</div>

          <div style={buttonRowStyle}>
            <button
              type="button"
              onClick={() => copyText(temporaryPassword)}
              style={secondaryButtonStyle}
            >
              Copy Password
            </button>

            <button
              type="button"
              onClick={() => copyText(generatedEmail)}
              style={primaryButtonStyle}
            >
              Copy Email Template
            </button>
          </div>

          <textarea value={generatedEmail} readOnly style={textareaStyle} />
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 38,
  lineHeight: 1.1,
  fontWeight: 800,
  color: "#171717",
};

const subtitleStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#665d52",
  lineHeight: 1.7,
  fontSize: 15,
  maxWidth: 720,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 22,
  padding: 22,
  display: "grid",
  gap: 16,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const resultCardStyle: React.CSSProperties = {
  ...cardStyle,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  color: "#171717",
  fontWeight: 800,
};

const grid2Style: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const grid3Style: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 7,
  color: "#171717",
  fontSize: 13,
  fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  borderRadius: 14,
  border: "1px solid #d8cebf",
  background: "#fcfbf8",
  padding: "0 14px",
  outline: "none",
  fontSize: 14,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 260,
  borderRadius: 14,
  border: "1px solid #d8cebf",
  background: "#fcfbf8",
  padding: 14,
  outline: "none",
  fontSize: 14,
  lineHeight: 1.7,
  resize: "vertical",
};

const formFooterStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};

const successBoxStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 700,
};

const passwordBoxStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 48,
  padding: "0 16px",
  borderRadius: 14,
  background: "#f8f5ef",
  border: "1px solid #e4dccf",
  color: "#171717",
  fontWeight: 900,
  letterSpacing: "0.04em",
};