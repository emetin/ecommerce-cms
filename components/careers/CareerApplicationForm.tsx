"use client";

import { useState } from "react";

type CareerApplicationFormProps = {
  positionTitle: string;
};

export default function CareerApplicationForm({
  positionTitle,
}: CareerApplicationFormProps) {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const formData = new FormData(event.currentTarget);

      const response = await fetch("/api/careers/apply", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Application could not be submitted.");
      }

      event.currentTarget.reset();
      setSuccessMessage("Your application has been submitted successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Application could not be submitted."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={kickerStyle}>Application Form</div>
      <h2 style={titleStyle}>Apply for this position</h2>
      <p style={textStyle}>
        Share your information and upload your resume. Our team will review your
        application and contact suitable candidates.
      </p>

      <input type="hidden" name="position" value={positionTitle} />

      <div>
        <label style={labelStyle}>Full Name *</label>
        <input name="fullName" type="text" required style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Email *</label>
        <input name="email" type="email" required style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Phone *</label>
        <input name="phone" type="text" required style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Location</label>
        <input name="location" type="text" style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>LinkedIn URL</label>
        <input name="linkedinUrl" type="url" style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Portfolio URL</label>
        <input name="portfolioUrl" type="url" style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Resume / CV *</label>
        <input
          name="resumeFile"
          type="file"
          accept=".pdf,.doc,.docx"
          required
          style={inputStyle}
        />
        <div style={helperStyle}>Accepted formats: PDF, DOC, DOCX. Max 5 MB.</div>
      </div>

      <div>
        <label style={labelStyle}>Cover Note</label>
        <textarea
          name="coverNote"
          rows={5}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Tell us briefly why this role interests you."
        />
      </div>

      <button type="submit" disabled={loading} style={buttonStyle}>
        {loading ? "Submitting..." : "Submit Application"}
      </button>

      {successMessage ? <div style={successStyle}>{successMessage}</div> : null}
      {errorMessage ? <div style={errorStyle}>{errorMessage}</div> : null}
    </form>
  );
}

const formStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e6ddd0",
  borderRadius: 28,
  padding: 28,
  display: "grid",
  gap: 16,
  boxShadow: "0 18px 45px rgba(23,23,23,0.06)",
};

const kickerStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#2f7d62",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.15,
  color: "#171717",
  fontWeight: 900,
};

const textStyle: React.CSSProperties = {
  margin: 0,
  color: "#5a5349",
  fontSize: 15,
  lineHeight: 1.75,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 14,
  fontWeight: 900,
  color: "#171717",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 50,
  padding: "13px 15px",
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 15,
};

const helperStyle: React.CSSProperties = {
  marginTop: 6,
  color: "#7a7064",
  fontSize: 12,
  lineHeight: 1.5,
};

const buttonStyle: React.CSSProperties = {
  minHeight: 50,
  borderRadius: 999,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
};

const successStyle: React.CSSProperties = {
  padding: "13px 15px",
  borderRadius: 14,
  background: "#edf5f1",
  color: "#245845",
  border: "1px solid rgba(47,125,98,0.18)",
};

const errorStyle: React.CSSProperties = {
  padding: "13px 15px",
  borderRadius: 14,
  background: "#fff4f2",
  color: "#a54034",
  border: "1px solid rgba(165,64,52,0.16)",
};