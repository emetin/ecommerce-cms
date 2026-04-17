"use client";

import { useState } from "react";

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/customer-auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to change password.");
      }

      window.location.href = data?.next_path || "/account";
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setSaving(false);
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
          Security Update
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
          Change Your Password
        </h1>

        <p
          style={{
            margin: "0 0 24px",
            color: "#665d52",
            lineHeight: 1.8,
            fontSize: 15,
          }}
        >
          Your account was signed in with a temporary password. Please set a new
          password before continuing.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
              placeholder="Repeat new password"
            />
          </div>

          <button type="submit" disabled={saving} style={primaryButtonStyle}>
            {saving ? "Saving..." : "Update Password"}
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