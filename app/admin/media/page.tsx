"use client";

import { useState } from "react";

export default function AdminMediaPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function runCleanup(deleteFiles: boolean) {
    try {
      setLoading(true);
      setError("");
      setResult(null);

      const res = await fetch("/api/media/cleanup-orphans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          delete_orphans: deleteFiles,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Cleanup failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 30, display: "grid", gap: 20 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800 }}>
        Media Management
      </h1>

      <div style={card}>
        <h2>Orphan Media Cleanup</h2>

        <p>
          Drive'da olup sistemde kullanılmayan görselleri tespit eder.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={btn}
            onClick={() => runCleanup(false)}
            disabled={loading}
          >
            {loading ? "Scanning..." : "Scan Only"}
          </button>

          <button
            style={danger}
            onClick={() => {
              const ok = confirm(
                "Tüm orphan dosyalar silinecek. Emin misin?"
              );
              if (ok) runCleanup(true);
            }}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Orphans"}
          </button>
        </div>

        {error && <div style={errorBox}>{error}</div>}

        {result && (
          <div style={success}>
            <p>Toplam: {result.scanned_file_count}</p>
            <p>Referanslı: {result.referenced_file_count}</p>
            <p>Orphan: {result.orphan_file_count}</p>
            <p>Silinen: {result.deleted_file_count}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd",
  padding: 20,
  borderRadius: 20,
};

const btn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #333",
  cursor: "pointer",
};

const danger: React.CSSProperties = {
  ...btn,
  background: "#ffefef",
  border: "1px solid red",
};

const success: React.CSSProperties = {
  marginTop: 15,
  padding: 10,
  background: "#eef8f0",
};

const errorBox: React.CSSProperties = {
  marginTop: 15,
  padding: 10,
  background: "#fff1f1",
};