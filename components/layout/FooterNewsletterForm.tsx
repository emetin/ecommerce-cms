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

      setMessage(data?.message || "Subscription successful.");
      setEmail("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form className="site-footer__newsletter-form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Subscribe"}
        </button>
      </form>

      {message ? (
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            lineHeight: 1.7,
            color: "#b7ead5",
          }}
        >
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            lineHeight: 1.7,
            color: "#ffd3cd",
          }}
        >
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}