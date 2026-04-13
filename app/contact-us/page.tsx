"use client";

import { useState } from "react";
import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";
import SectionHeading from "../../components/ui/SectionHeading";
import ButtonLink from "../../components/ui/ButtonLink";

export default function ContactUsPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    company_type: "",
    project_type: "",
    estimated_quantity: "",
    target_market: "",
    requested_categories: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setResultMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          page_url: "/contact-us",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to submit form.");
      }

      setResultMessage("Your inquiry has been sent successfully.");
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        company: "",
        company_type: "",
        project_type: "",
        estimated_quantity: "",
        target_market: "",
        requested_categories: "",
        message: "",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section
        style={{
          background:
            "linear-gradient(180deg, #f8f4ed 0%, #f3eee6 58%, #ffffff 100%)",
          borderBottom: "1px solid #ede3d7",
          padding: "84px 0 62px",
        }}
      >
        <Container>
          <div style={{ maxWidth: 900 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 34,
                padding: "0 14px",
                borderRadius: 999,
                background: "#e9e2d6",
                color: "#5f564c",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 18,
              }}
            >
              B2B Inquiry
            </div>

            <h1
              style={{
                margin: "0 0 18px",
                fontSize: "clamp(2.5rem, 4.8vw, 4.6rem)",
                lineHeight: 1.02,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#171717",
              }}
            >
              Start a hospitality sourcing conversation with a clearer project brief
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: 760,
                color: "#5d554a",
                fontSize: 17,
                lineHeight: 1.9,
              }}
            >
              Share your company details, project type, target market, and requested categories so your inquiry reaches the right direction from the beginning.
            </p>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <div className="contact-grid">
            <div
              style={{
                background: "#fff",
                border: "1px solid #e6ddd0",
                borderRadius: 28,
                padding: 30,
                boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
              }}
            >
              <SectionHeading
                kicker="Project Inquiry Form"
                title="Share the essentials of your sourcing request"
                text="This form is structured to collect more useful B2B lead data for hospitality, residence, and project-based textile discussions."
              />

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
                <div className="form-grid-2">
                  <div>
                    <label style={labelStyle}>First Name</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={form.first_name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, first_name: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Last Name</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={form.last_name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, last_name: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      style={inputStyle}
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={form.phone}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div>
                    <label style={labelStyle}>Company</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={form.company}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, company: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Company Type</label>
                    <select
                      style={inputStyle}
                      value={form.company_type}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, company_type: e.target.value }))
                      }
                    >
                      <option value="">Select</option>
                      <option value="Hotel">Hotel</option>
                      <option value="Resort">Resort</option>
                      <option value="Residence">Residence</option>
                      <option value="Property Management">Property Management</option>
                      <option value="Procurement Company">Procurement Company</option>
                      <option value="Designer / Architect">Designer / Architect</option>
                      <option value="Distributor">Distributor</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div>
                    <label style={labelStyle}>Project Type</label>
                    <select
                      style={inputStyle}
                      value={form.project_type}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, project_type: e.target.value }))
                      }
                    >
                      <option value="">Select</option>
                      <option value="New Opening">New Opening</option>
                      <option value="Renovation">Renovation</option>
                      <option value="Seasonal Replenishment">Seasonal Replenishment</option>
                      <option value="Sample Request">Sample Request</option>
                      <option value="Long-Term Supply">Long-Term Supply</option>
                      <option value="Custom Program">Custom Program</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Estimated Quantity</label>
                    <input
                      type="text"
                      style={inputStyle}
                      placeholder="Ex: 500 bath towels / 120 bedding sets"
                      value={form.estimated_quantity}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          estimated_quantity: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div>
                    <label style={labelStyle}>Target Market / Delivery Country</label>
                    <input
                      type="text"
                      style={inputStyle}
                      placeholder="Ex: USA, Miami / Bahamas / Maldives"
                      value={form.target_market}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          target_market: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Requested Categories</label>
                    <input
                      type="text"
                      style={inputStyle}
                      placeholder="Ex: Towels, Bedding, Robes, Pool Towels"
                      value={form.requested_categories}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          requested_categories: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Message</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 170, resize: "vertical" }}
                    value={form.message}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, message: e.target.value }))
                    }
                    placeholder="Share the scope, timeline, product priorities, or any important details."
                  />
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button type="submit" style={primaryButtonStyle} disabled={loading}>
                    {loading ? "Sending..." : "Send Inquiry"}
                  </button>
                  <ButtonLink href="/collections" variant="secondary">
                    Explore Collections
                  </ButtonLink>
                </div>

                {resultMessage ? (
                  <div style={successStyle}>{resultMessage}</div>
                ) : null}

                {errorMessage ? (
                  <div style={errorStyle}>{errorMessage}</div>
                ) : null}
              </form>
            </div>

            <div
              style={{
                display: "grid",
                gap: 18,
              }}
            >
              <div style={infoCardStyle}>
                <div style={infoKickerStyle}>Lead Quality</div>
                <div style={infoTitleStyle}>More useful first contact</div>
                <div style={infoTextStyle}>
                  Collecting project type, quantity, and target market helps the conversation start with more relevant context.
                </div>
              </div>

              <div style={infoCardStyle}>
                <div style={infoKickerStyle}>Hospitality Focus</div>
                <div style={infoTitleStyle}>Better fit for B2B buyers</div>
                <div style={infoTextStyle}>
                  The form is designed for hotels, resorts, residences, procurement teams, and long-term project-based inquiries.
                </div>
              </div>

              <div style={infoCardStyle}>
                <div style={infoKickerStyle}>Collections</div>
                <div style={infoTitleStyle}>Category-driven discussion</div>
                <div style={infoTextStyle}>
                  Buyers can align their inquiry with categories such as bedding, towels, robes, and other hospitality textile groups.
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 800,
  fontSize: 15,
  color: "#171717",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 15,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const successStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 14,
  background: "#edf5f1",
  color: "#245845",
  border: "1px solid rgba(47,125,98,0.18)",
};

const errorStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 14,
  background: "#fff4f2",
  color: "#a54034",
  border: "1px solid rgba(165,64,52,0.16)",
};

const infoCardStyle: React.CSSProperties = {
  background: "#faf7f1",
  border: "1px solid #e8dfd2",
  borderRadius: 24,
  padding: 24,
};

const infoKickerStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#7a7064",
  marginBottom: 10,
};

const infoTitleStyle: React.CSSProperties = {
  marginBottom: 8,
  fontSize: 22,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#171717",
};

const infoTextStyle: React.CSSProperties = {
  color: "#5a5349",
  lineHeight: 1.85,
  fontSize: 15,
};