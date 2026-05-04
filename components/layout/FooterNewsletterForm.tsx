"use client";

import { useState } from "react";

export default function FooterNewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          source_page: "footer",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to subscribe.");
      }

      setMessage(data?.message || "Subscribed successfully.");
      setEmail("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={inputWrapStyle}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Sending..." : "Subscribe"}
        </button>
      </form>

      {message ? <div style={successStyle}>{message}</div> : null}
      {errorMessage ? <div style={errorStyle}>{errorMessage}</div> : null}
    </div>
  );
}

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 14,
};

const inputWrapStyle: React.CSSProperties = {
  minHeight: 50,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  display: "flex",
  alignItems: "center",
  padding: "0 16px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: 0,
  background: "transparent",
  color: "#fff",
  outline: "none",
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  minHeight: 50,
  borderRadius: 999,
  border: "1px solid var(--primary)",
  background: "var(--primary)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const successStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 13,
  color: "#b7ead5",
};

const errorStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 13,
  color: "#ffd3cd",
};