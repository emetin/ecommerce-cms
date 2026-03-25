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

      setResultMessage("Your message has been sent successfully.");
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        company: "",
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
          <div style={{ maxWidth: 860 }}>
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
              Contact Us
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
              Start a conversation with a more structured and confident textile brand
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
              Reach out to discuss textile categories, collections and future project requirements.
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
                kicker="Contact Form"
                title="A contact-first approach fits this structure best"
                text="This form saves submissions to a separate Google Sheet so the project stays lightweight and organized."
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
                  <label style={labelStyle}>Message</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 170, resize: "vertical" }}
                    value={form.message}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, message: e.target.value }))
                    }
                  />
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button type="submit" style={primaryButtonStyle} disabled={loading}>
                    {loading ? "Sending..." : "Send Message"}
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
                <div style={infoKickerStyle}>General Contact</div>
                <div style={infoTitleStyle}>Corporate communication</div>
                <div style={infoTextStyle}>
                  Use this area for general inquiries, category discussions and brand communication.
                </div>
              </div>

              <div style={infoCardStyle}>
                <div style={infoKickerStyle}>Collections</div>
                <div style={infoTitleStyle}>Product and category discussions</div>
                <div style={infoTextStyle}>
                  Direct visitors toward collections and product-family conversations rather than retail behavior.
                </div>
              </div>

              <div style={infoCardStyle}>
                <div style={infoKickerStyle}>Partnership</div>
                <div style={infoTitleStyle}>Long-term textile perspective</div>
                <div style={infoTextStyle}>
                  This website structure is strongest when it supports trust, clarity and future project dialogue.
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