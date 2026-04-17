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
        body: JSON.stringify({ email }),
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
          Forgot Password
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
          Enter your email address and we will send you a secure reset link.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            autoComplete="email"
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
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {message ? (
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
            {message}
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