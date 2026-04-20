"use client";

import { useState } from "react";

type ApiResult = {
  ok?: boolean;
  error?: string;
  debug?: string;
  order?: {
    id: string;
    order_number: string;
    status: string;
    grand_total: number;
  };
  items?: Array<{
    id: string;
    product_title: string;
    quantity: number;
    line_total: number;
  }>;
  next_path?: string;
};

export default function TestOrderPage() {
  const [email, setEmail] = useState("test@example.com");
  const [firstName, setFirstName] = useState("Ece");
  const [lastName, setLastName] = useState("Mavi");
  const [company, setCompany] = useState("Patak Textile");
  const [phone, setPhone] = useState("05555555555");
  const [country, setCountry] = useState("Turkey");
  const [city, setCity] = useState("Denizli");
  const [addressLine1, setAddressLine1] = useState("Test Address 1");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("20000");
  const [note, setNote] = useState("Test order");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  async function handleCreateOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          company,
          phone,
          country,
          city,
          address_line_1: addressLine1,
          address_line_2: addressLine2,
          postal_code: postalCode,
          note,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const rawText = await res.text();

      if (!contentType.includes("application/json")) {
        setResult({
          ok: false,
          error: "API JSON yerine HTML veya başka bir response döndürdü.",
          debug: rawText.slice(0, 500),
        });
        return;
      }

      const data = JSON.parse(rawText);

      if (!res.ok) {
        setResult({
          ok: false,
          error: data?.error || "Order creation failed.",
          debug: JSON.stringify(data, null, 2),
        });
        return;
      }

      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Test Order Create
      </h1>

      <p style={{ marginBottom: 24, color: "#555" }}>
        Bu sayfa mevcut cart cookie üzerinden test siparişi oluşturur.
      </p>

      <form onSubmit={handleCreateOrder} style={{ display: "grid", gap: 14 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <div style={grid2}>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <input
          type="text"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
        />

        <div style={grid2}>
          <input
            type="text"
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={inputStyle}
          />
        </div>

        <input
          type="text"
          placeholder="Address Line 1"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Address Line 2"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Postal Code"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          style={inputStyle}
        />

        <textarea
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "14px 18px",
            borderRadius: 10,
            border: "none",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Creating Order..." : "Create Test Order"}
        </button>
      </form>

      {result && (
        <div
          style={{
            marginTop: 28,
            padding: 18,
            border: "1px solid #ddd",
            borderRadius: 12,
            background: "#fafafa",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
            Result
          </h2>

          {!result.ok ? (
            <div style={{ display: "grid", gap: 12 }}>
              <p style={{ color: "crimson", margin: 0 }}>
                {result.error || "Order creation failed."}
              </p>

              {result.debug && (
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    background: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: 8,
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    fontSize: 12,
                  }}
                >
                  {result.debug}
                </pre>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ margin: 0 }}>
                <strong>Order Number:</strong> {result.order?.order_number}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Status:</strong> {result.order?.status}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Grand Total:</strong> {result.order?.grand_total}
              </p>

              {result.next_path && (
                <p style={{ margin: 0 }}>
                  <strong>Next Path:</strong> {result.next_path}
                </p>
              )}

              {!!result.items?.length && (
                <div style={{ marginTop: 8 }}>
                  <strong>Items:</strong>
                  <ul style={{ marginTop: 8 }}>
                    {result.items.map((item) => (
                      <li key={item.id}>
                        {item.product_title} - Qty: {item.quantity} - Total: {item.line_total}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #d0d0d0",
  outline: "none",
  fontSize: 14,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};