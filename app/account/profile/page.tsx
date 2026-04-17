"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CustomerProfile = {
  id: string;
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
  created_at: string;
  updated_at: string;
  last_login_at: string;
  tax_exempt: string;
  approved_at: string;
};

export default function AccountProfilePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company: "",
    phone: "",
    country: "",
    city: "",
    address_line_1: "",
    address_line_2: "",
    postal_code: "",
  });

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/customer-auth/profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (!active) return;

        if (!response.ok || !data?.ok || !data?.customer) {
          router.push("/portal-login");
          return;
        }

        const customer = data.customer as CustomerProfile;

        setEmail(customer.email || "");
        setForm({
          first_name: customer.first_name || "",
          last_name: customer.last_name || "",
          company: customer.company || "",
          phone: customer.phone || "",
          country: customer.country || "",
          city: customer.city || "",
          address_line_1: customer.address_line_1 || "",
          address_line_2: customer.address_line_2 || "",
          postal_code: customer.postal_code || "",
        });
      } catch {
        if (!active) return;
        setError("Failed to load profile.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/customer-auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Profile update failed.");
      }

      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>Loading profile...</div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={wrapStyle}>
        <div style={heroStyle}>
          <div>
            <div style={eyebrowStyle}>Customer Profile</div>
            <h1 style={titleStyle}>Edit Your Account Details</h1>
            <p style={textStyle}>
              Keep your company and delivery information updated for faster
              checkout.
            </p>
          </div>

          <a href="/account" style={backLinkStyle}>
            Back to Account
          </a>
        </div>

        <form onSubmit={handleSave} style={cardStyle}>
          <div style={sectionTitleStyle}>Basic Information</div>

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
              label="Company"
              value={form.company}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, company: value }))
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
              label="Email"
              value={email}
              onChange={() => {}}
              disabled
            />
          </div>

          <div style={sectionTitleStyle}>Saved Address</div>

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

          {message ? <div style={successStyle}>{message}</div> : null}
          {error ? <div style={errorStyle}>{error}</div> : null}

          <button
            type="submit"
            disabled={saving}
            style={{
              ...buttonStyle,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div style={fieldWrapStyle}>
      <label style={labelStyle}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          ...inputStyle,
          opacity: disabled ? 0.7 : 1,
          background: disabled ? "#f6f2eb" : "#fff",
        }}
      />
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f7f4ee",
  padding: "40px 20px",
};

const wrapStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  display: "grid",
  gap: 24,
};

const heroStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
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
  margin: 0,
  fontSize: 40,
  lineHeight: 1.05,
  color: "#171717",
  fontWeight: 800,
};

const textStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#665d52",
  lineHeight: 1.8,
  fontSize: 15,
  maxWidth: 760,
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  textDecoration: "none",
  fontWeight: 800,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e6ddd0",
  borderRadius: 28,
  padding: 28,
  boxShadow: "0 10px 30px rgba(23,23,23,0.05)",
  display: "grid",
  gap: 18,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 20,
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
  minHeight: 50,
  borderRadius: 14,
  border: "1px solid #ddd3c5",
  padding: "0 14px",
  fontSize: 15,
  color: "#171717",
};

const buttonStyle: React.CSSProperties = {
  minHeight: 54,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontSize: 15,
  fontWeight: 800,
};

const successStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #cde8ce",
  background: "#f3fff3",
  color: "#2c6b2f",
  fontSize: 14,
  fontWeight: 600,
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