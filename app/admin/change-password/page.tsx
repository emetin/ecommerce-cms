"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

type ChangePasswordResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  nextPath?: string;
};

export default function AdminChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/admin-auth/change-password", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = (await response.json()) as ChangePasswordResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Password could not be changed.");
      }

      setSuccessMessage("Password changed successfully.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.replace(data.nextPath || "/admin");
        router.refresh();
      }, 600);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown password error."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={pageStyle}>
      <section style={panelStyle}>
        <div>
          <div style={eyebrowStyle}>Security</div>
          <h1 style={titleStyle}>Set Your Password</h1>
          <p style={subtitleStyle}>
            Use your temporary password once, then create your own password.
          </p>
        </div>

        {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}

        {successMessage ? (
          <div style={successBoxStyle}>{successMessage}</div>
        ) : null}

        <form onSubmit={handleSubmit} style={formStyle}>
          <Field label="Current Password">
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Temporary password"
              style={inputStyle}
            />
          </Field>

          <Field label="New Password">
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              style={inputStyle}
            />
          </Field>

          <Field label="Confirm Password">
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Repeat new password"
              style={inputStyle}
            />
          </Field>

          <div style={actionsStyle}>
            <button type="submit" disabled={isSaving} style={primaryButtonStyle}>
              {isSaving ? "Saving..." : "Save Password"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin")}
              style={secondaryButtonStyle}
            >
              Cancel
            </button>
          </div>
        </form>

        <p style={noteStyle}>
          After saving, your temporary password will no longer be valid.
        </p>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

const pageStyle: CSSProperties = {
  display: "grid",
  justifyContent: "center",
  alignItems: "start",
  paddingTop: 18,
};

const panelStyle: CSSProperties = {
  width: "100%",
  maxWidth: 500,
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 14,
  padding: 20,
  display: "grid",
  gap: 16,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.11em",
  textTransform: "uppercase",
  color: "#8a8177",
  fontWeight: 900,
  marginBottom: 5,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  lineHeight: 1.15,
  fontWeight: 850,
  color: "#171717",
};

const subtitleStyle: CSSProperties = {
  margin: "7px 0 0",
  color: "#70675f",
  fontSize: 13,
  lineHeight: 1.55,
};

const formStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
};

const labelStyle: CSSProperties = {
  color: "#171717",
  fontSize: 12,
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  border: "1px solid #d8cebf",
  borderRadius: 10,
  background: "#fcfbf8",
  color: "#171717",
  padding: "0 11px",
  outline: "none",
  fontSize: 13,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 2,
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 850,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 750,
  cursor: "pointer",
};

const errorBoxStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontSize: 13,
  fontWeight: 750,
};

const successBoxStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontSize: 13,
  fontWeight: 750,
};

const noteStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
  color: "#70675f",
  background: "#f8f5ef",
  border: "1px solid #e8dfd2",
  borderRadius: 10,
  padding: "10px 12px",
};