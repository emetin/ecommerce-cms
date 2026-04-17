"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !token) {
      setError("Invalid reset link.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/customer-auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          token,
          newPassword,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || !data?.ok) {
        setError(data?.error || "Reset failed.");
        return;
      }

      setSuccess(data?.message || "Password updated successfully.");

      setTimeout(() => {
        router.push("/account/login");
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 16px",
        background: "#f7f7f7",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#ffffff",
          borderRadius: 20,
          padding: 28,
          border: "1px solid #e5e5e5",
        }}
      >
        <h1
          style={{
            fontSize: 28,
            marginTop: 0,
            marginBottom: 10,
            color: "#171717",
          }}
        >
          Reset Password
        </h1>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: "#666",
            marginTop: 0,
            marginBottom: 20,
          }}
        >
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            required
            style={{
              width: "100%",
              height: 48,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #d9d9d9",
              marginBottom: 12,
              fontSize: 14,
            }}
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            required
            style={{
              width: "100%",
              height: 48,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #d9d9d9",
              marginBottom: 14,
              fontSize: 14,
            }}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              height: 48,
              border: "none",
              borderRadius: 12,
              background: "#171717",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 700,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </form>

        {success ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              background: "#f6f8f7",
              color: "#1f5133",
              fontSize: 14,
              lineHeight: 1.7,
              border: "1px solid #dbe7df",
            }}
          >
            {success}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              background: "#fff4f4",
              color: "#b42318",
              fontSize: 14,
              lineHeight: 1.7,
              border: "1px solid #f1c9c9",
            }}
          >
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}