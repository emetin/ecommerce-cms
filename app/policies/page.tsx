

import type { Metadata } from "next";
import Link from "next/link";
import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";
import SectionHeading from "../../components/ui/SectionHeading";
import ButtonLink from "../../components/ui/ButtonLink";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Policies",
  description:
    "Review Patak Textile policy pages including privacy policy, cookie policy and terms and conditions.",
  path: "/policies",
});

export default function PoliciesPage() {
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
              Policies
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
              Legal and website policy information
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
              This section provides the main policy pages related to privacy,
              cookies and website usage for the Patak Textile corporate website.
            </p>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <SectionHeading
            kicker="Policy Directory"
            title="Review the main website policies"
            text="These pages are structured to support a cleaner and more professional corporate website presentation."
          />

          <div className="cards-grid cards-grid--3">
            <Link href="/policies/privacy-policy" style={cardLinkStyle}>
              <article style={policyCardStyle}>
                <div style={policyKickerStyle}>Privacy Policy</div>
                <h2 style={policyTitleStyle}>How personal information is handled</h2>
                <p style={policyTextStyle}>
                  Learn what information may be collected through contact and
                  newsletter forms, how it is used and how to contact us about it.
                </p>
                <span style={policyActionStyle}>View Policy →</span>
              </article>
            </Link>

            <Link href="/policies/cookie-policy" style={cardLinkStyle}>
              <article style={policyCardStyle}>
                <div style={policyKickerStyle}>Cookie Policy</div>
                <h2 style={policyTitleStyle}>How website technologies are used</h2>
                <p style={policyTextStyle}>
                  Review information about cookies, analytics and related browser
                  controls used to support the site experience.
                </p>
                <span style={policyActionStyle}>View Policy →</span>
              </article>
            </Link>

            <Link href="/policies/terms-and-conditions" style={cardLinkStyle}>
              <article style={policyCardStyle}>
                <div style={policyKickerStyle}>Terms & Conditions</div>
                <h2 style={policyTitleStyle}>Rules for using this website</h2>
                <p style={policyTextStyle}>
                  Read the general terms that govern website access, content usage,
                  intellectual property and general limitation language.
                </p>
                <span style={policyActionStyle}>View Policy →</span>
              </article>
            </Link>
          </div>

          <div style={{ marginTop: 28 }}>
            <ButtonLink href="/" variant="secondary">
              ← Back to Home
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}

const cardLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  display: "block",
  height: "100%",
};

const policyCardStyle: React.CSSProperties = {
  height: "100%",
  padding: 28,
  borderRadius: 26,
  background: "#fff",
  border: "1px solid #e6ddd0",
  boxShadow: "0 12px 30px rgba(23,23,23,0.04)",
};

const policyKickerStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#7a7064",
  marginBottom: 12,
};

const policyTitleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 24,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#171717",
};

const policyTextStyle: React.CSSProperties = {
  margin: "0 0 16px",
  color: "#5a5349",
  lineHeight: 1.85,
  fontSize: 15,
};

const policyActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontWeight: 800,
  color: "#2f7d62",
  fontSize: 14,
};