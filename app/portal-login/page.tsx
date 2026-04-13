"use client";

import { useState } from "react";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/customer-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Login failed.");
      }

      window.location.href = "/account";
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
        display: "grid",
        placeItems: "center",
        padding: "40px 20px",
        background: "#f7f4ee",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
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
          Approved customer login
        </h1>

        <p
          style={{
            margin: "0 0 24px",
            color: "#665d52",
            lineHeight: 1.8,
            fontSize: 15,
          }}
        >
          Approved B2B customers can log in here to view pricing and submit
          orders through the customer portal.
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

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {message ? (
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
            {message}
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
          <a href="/apply-for-account" style={secondaryLinkStyle}>
            Apply for an account
          </a>
          <a href="/products" style={textLinkStyle}>
            Continue browsing products
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

const textLinkStyle: React.CSSProperties = {
  color: "#171717",
  fontWeight: 700,
  textDecoration: "none",
  textAlign: "center",
};