"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const searchParams = useSearchParams();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setMessage("");
      setErrorMessage("");

      if (!token) {
        throw new Error("Invalid reset link.");
      }

      if (!newPassword || !confirmPassword) {
        throw new Error("Please fill in both password fields.");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const response = await fetch("/api/customer-auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Password reset failed.");
      }

      setMessage(
        data?.message ||
          "Your password has been updated successfully. You can now log in."
      );
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={mainStyle}>
      <section style={cardStyle}>
        <div style={kickerStyle}>Customer Portal</div>

        <h1 style={titleStyle}>Reset Password</h1>

        <p style={subtitleStyle}>
          Create a new password for your Globaltex customer portal account.
        </p>

        {email ? (
          <div style={emailBoxStyle}>
            <strong>Account:</strong> {email}
          </div>
        ) : null}

        {!token ? (
          <div style={errorBoxStyle}>Invalid or missing reset token.</div>
        ) : (
          <form onSubmit={handleSubmit} style={formStyle}>
            <div>
              <label style={labelStyle}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimum 10 characters"
                style={inputStyle}
              />
              <div style={helperStyle}>
                Use at least 10 characters with uppercase, lowercase, number,
                and special character.
              </div>
            </div>

            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat new password"
                style={inputStyle}
              />
            </div>

            <button type="submit" disabled={submitting} style={buttonStyle}>
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        {message ? <div style={successBoxStyle}>{message}</div> : null}
        {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}

        <a href="/portal-login" style={linkButtonStyle}>
          Back to Customer Login
        </a>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main style={mainStyle}>Loading...</main>}>
      <ResetPasswordContent />
    </Suspense>
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
  maxWidth: 480,
  background: "#fff",
  border: "1px solid #e6ddd0",
  borderRadius: 24,
  padding: 28,
  boxShadow: "0 10px 30px rgba(23,23,23,0.05)",
};

const kickerStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#8a7f72",
  fontWeight: 800,
  marginBottom: 10,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 32,
  lineHeight: 1.1,
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  margin: "10px 0 20px",
  color: "#665d52",
  lineHeight: 1.7,
  fontSize: 14,
};

const emailBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "#f8f5ef",
  border: "1px solid #e4dccf",
  color: "#171717",
  fontSize: 14,
  marginBottom: 16,
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: 15,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  color: "#171717",
  fontWeight: 800,
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  borderRadius: 14,
  border: "1px solid #d8cebf",
  background: "#fcfbf8",
  padding: "0 14px",
  fontSize: 14,
  outline: "none",
};

const helperStyle: React.CSSProperties = {
  marginTop: 7,
  color: "#7a7166",
  fontSize: 12,
  lineHeight: 1.5,
};

const buttonStyle: React.CSSProperties = {
  minHeight: 52,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const successBoxStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 13,
  borderRadius: 14,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontWeight: 700,
  lineHeight: 1.6,
  fontSize: 14,
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 13,
  borderRadius: 14,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 700,
  lineHeight: 1.6,
  fontSize: 14,
};

const linkButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 50,
  marginTop: 18,
  borderRadius: 999,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  textDecoration: "none",
};