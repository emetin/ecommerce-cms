"use client";

import { useState } from "react";

type ForgotResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  temporaryPassword?: string;
  customer?: {
    email?: string;
    contactName?: string;
    companyName?: string;
  };
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ForgotResponse | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response = await fetch("/api/customer-auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as ForgotResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Request failed.");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "40px 20px",
        background: "#f7f4ee",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
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
          Customer Portal
        </div>

        <h1
          style={{
            fontSize: 38,
            lineHeight: 1.05,
            margin: "0 0 12px",
            fontWeight: 800,
            color: "#171717",
          }}
        >
          Forgot Password
        </h1>

        <p
          style={{
            margin: "0 0 24px",
            color: "#665d52",
            lineHeight: 1.8,
            fontSize: 15,
          }}
        >
          Enter your account email to generate a temporary password. You will be
          asked to change it after login.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="your@email.com"
            />
          </div>

          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? "Generating..." : "Generate Temporary Password"}
          </button>
        </form>

        {error ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 16,
              background: "#fff3f3",
              border: "1px solid #efcaca",
              color: "#8d2f2f",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        {result?.ok ? (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 16,
              background: "#eef8f0",
              border: "1px solid #cfe7d8",
              color: "#1d6a43",
              lineHeight: 1.8,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Temporary password generated
            </div>
            <div>
              <strong>Email:</strong> {result.customer?.email || "-"}
            </div>
            <div>
              <strong>Temporary Password:</strong>{" "}
              {result.temporaryPassword || "-"}
            </div>
            <div style={{ marginTop: 8 }}>
              Use this password at{" "}
              <a href="/portal-login" style={{ color: "#1d6a43", fontWeight: 800 }}>
                portal login
              </a>
              . You will then be asked to change it.
            </div>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: "1px solid #eee4d7",
            display: "grid",
            gap: 10,
          }}
        >
          <a href="/portal-login" style={secondaryLinkStyle}>
            Back to Login
          </a>
        </div>
      </div>
    </main>
  );
}

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