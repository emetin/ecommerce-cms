"use client";

import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/customer-auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      setMessage(
        data?.message ||
          "If an account exists for this email, a password reset link has been sent."
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={mainStyle}>
      <section style={cardStyle}>
        <div style={kickerStyle}>Customer Portal</div>

        <h1 style={titleStyle}>Forgot Password</h1>

        <p style={subtitleStyle}>
          Enter your account email address and we will send you a secure password
          reset link.
        </p>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div>
            <label htmlFor="email" style={labelStyle}>
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={isSubmitting} style={buttonStyle}>
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {message ? <div style={successBoxStyle}>{message}</div> : null}
        {error ? <div style={errorBoxStyle}>{error}</div> : null}

        <div style={footerStyle}>
          <a href="/portal-login" style={secondaryButtonStyle}>
            Back to Customer Login
          </a>
        </div>
      </section>
    </main>
  );
}

const mainStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "32px 16px",
  background: "#f7f4ee",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "#ffffff",
  borderRadius: 24,
  padding: 28,
  border: "1px solid #e6ddd0",
  boxShadow: "0 10px 30px rgba(23,23,23,0.05)",
};

const kickerStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#8a7f72",
  marginBottom: 10,
};

const titleStyle: React.CSSProperties = {
  fontSize: 32,
  lineHeight: 1.1,
  marginTop: 0,
  marginBottom: 10,
  color: "#171717",
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
  color: "#665d52",
  marginTop: 0,
  marginBottom: 20,
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
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
  height: 50,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  fontSize: 14,
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  height: 50,
  border: "1px solid #171717",
  borderRadius: 999,
  background: "#171717",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 800,
  cursor: isSubmittingCursor(),
  opacity: 1,
};

function isSubmittingCursor() {
  return "pointer";
}

const successBoxStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 13,
  borderRadius: 14,
  background: "#eef8f0",
  color: "#1d6a43",
  fontSize: 14,
  lineHeight: 1.7,
  border: "1px solid #cfe7d8",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 13,
  borderRadius: 14,
  background: "#fff1f1",
  color: "#8d2f2f",
  fontSize: 14,
  lineHeight: 1.7,
  border: "1px solid #f0c9c9",
  fontWeight: 700,
};

const footerStyle: React.CSSProperties = {
  marginTop: 18,
  paddingTop: 18,
  borderTop: "1px solid #ece7de",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: 50,
  borderRadius: 999,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  textDecoration: "none",
};