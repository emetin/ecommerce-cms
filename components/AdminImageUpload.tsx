"use client";

import { useState } from "react";

export default function AdminImageUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [entityType, setEntityType] = useState("product");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Dosya seç");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", entityType);
    formData.append("alt", alt);

    setLoading(true);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.ok) {
        alert(data.error);
        return;
      }

      setUploadedUrl(data.url);
    } catch (err) {
      console.error(err);
      alert("Upload hata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 500 }}>
      <h2>Image Upload</h2>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <br /><br />

      <input
        type="text"
        placeholder="Alt text"
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
      />

      <br /><br />

      <select
        value={entityType}
        onChange={(e) => setEntityType(e.target.value)}
      >
        <option value="product">Product</option>
        <option value="collection">Collection</option>
        <option value="blog">Blog</option>
      </select>

      <br /><br />

      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload"}
      </button>

      {uploadedUrl && (
        <>
          <p>Uploaded:</p>
          <img src={uploadedUrl} alt={alt} width={200} />
        </>
      )}
    </div>
  );
}