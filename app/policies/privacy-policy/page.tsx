import type { Metadata } from "next";
import Container from "../../../components/ui/Container";
import Section from "../../../components/ui/Section";
import ButtonLink from "../../../components/ui/ButtonLink";
import { buildPageMetadata } from "../../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "Review the Patak Textile privacy policy for information related to website forms, communication and data handling.",
  path: "/policies/privacy-policy",
});

export default function PrivacyPolicyPage() {
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
          <div style={{ maxWidth: 920 }}>
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
              Privacy Policy
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
              Privacy Policy
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: 780,
                color: "#5d554a",
                fontSize: 17,
                lineHeight: 1.9,
              }}
            >
              This Privacy Policy explains how Patak Textile may collect, use and
              protect information submitted through this website.
            </p>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <div style={policyLayoutStyle}>
            <div style={{ marginBottom: 24 }}>
              <ButtonLink href="/policies" variant="secondary">
                ← Back to Policies
              </ButtonLink>
            </div>

            <div style={policyBodyStyle}>
              <h2>1. Who We Are</h2>
              <p>
                Patak Textile operates this website as a corporate catalog and
                communication platform for textile collections, product categories
                and business inquiries.
              </p>

              <h2>2. Information We May Collect</h2>
              <p>
                We may collect information that you voluntarily provide through the
                website, including your name, email address, phone number, company
                name and message details submitted through contact forms. We may
                also collect email addresses submitted through newsletter forms.
              </p>

              <h2>3. How We Use Information</h2>
              <p>
                Information submitted through this website may be used to respond
                to inquiries, provide requested information, review potential
                business opportunities, send selected updates and improve the
                general website experience.
              </p>

              <h2>4. Communications</h2>
              <p>
                If you submit a contact form, we may use your details to respond to
                your request. If you subscribe to newsletter updates, we may use
                your email address to send selected brand, collection or website
                related communications.
              </p>

              <h2>5. Data Storage</h2>
              <p>
                Website form submissions may be stored through third-party tools
                used to operate the website workflow, including Google Sheets and
                related email notification tools used for internal communication and
                response management.
              </p>

              <h2>6. Data Sharing</h2>
              <p>
                We do not sell personal information submitted through this website.
                Information may only be shared where reasonably necessary for
                internal communication, operational processing, website management
                or legal compliance.
              </p>

              <h2>7. Retention</h2>
              <p>
                Information may be retained for as long as reasonably necessary to
                respond to communications, maintain records, support legitimate
                business operations or comply with legal obligations.
              </p>

              <h2>8. Your Choices</h2>
              <p>
                You may contact us if you want to request access to, correction of
                or deletion of information previously submitted through this
                website, subject to any legal or operational limitations.
              </p>

              <h2>9. Security</h2>
              <p>
                We take reasonable steps to protect submitted information, but no
                website, database or electronic transmission method can be
                guaranteed to be fully secure.
              </p>

              <h2>10. Third-Party Services</h2>
              <p>
                This website may rely on third-party services, platforms or
                integrations to support hosting, forms, analytics, email
                communication or other operational functions.
              </p>

              <h2>11. Policy Updates</h2>
              <p>
                This Privacy Policy may be updated from time to time. Any revised
                version will be posted on this page.
              </p>

              <h2>12. Contact</h2>
              <p>
                If you have questions about this Privacy Policy or the handling of
                submitted information, please contact Patak Textile through the
                website contact page.
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

const policyLayoutStyle: React.CSSProperties = {
  maxWidth: 920,
};

const policyBodyStyle: React.CSSProperties = {
  padding: 32,
  borderRadius: 28,
  border: "1px solid #e6ddd0",
  background: "#fff",
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
  fontSize: 16,
  lineHeight: 1.95,
  color: "#4f4a42",
};