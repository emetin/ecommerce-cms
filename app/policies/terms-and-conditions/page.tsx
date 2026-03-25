

import type { Metadata } from "next";
import Container from "../../../components/ui/Container";
import Section from "../../../components/ui/Section";
import ButtonLink from "../../../components/ui/ButtonLink";
import { buildPageMetadata } from "../../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms & Conditions",
  description:
    "Review the Patak Textile website terms and conditions related to website access, content usage and general limitations.",
  path: "/policies/terms-and-conditions",
});

export default function TermsAndConditionsPage() {
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
              Terms & Conditions
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
              Terms & Conditions
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
              These Terms & Conditions govern general use of the Patak Textile
              website and its content.
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
              <h2>1. Website Use</h2>
              <p>
                This website is provided for general informational, branding and
                communication purposes related to Patak Textile, its collections,
                product categories and business presence.
              </p>

              <h2>2. Content Purpose</h2>
              <p>
                The information presented on this website is intended to support a
                corporate catalog and general brand presentation. Website content
                does not automatically create a contractual offer, purchase
                agreement or guaranteed commercial commitment.
              </p>

              <h2>3. Intellectual Property</h2>
              <p>
                Website content, including text, layout, graphics, branding,
                visuals and other materials, may be protected by applicable
                intellectual property rights and may not be copied, reproduced or
                reused without appropriate permission.
              </p>

              <h2>4. Accuracy of Information</h2>
              <p>
                We aim to keep website information clear and up to date, but we do
                not guarantee that all information is complete, current or free from
                error at all times.
              </p>

              <h2>5. Third-Party Links and Services</h2>
              <p>
                This website may contain references to third-party platforms,
                services or links. We are not responsible for the content, privacy
                practices or availability of third-party websites or services.
              </p>

              <h2>6. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by applicable law, Patak Textile
                will not be liable for indirect, incidental or consequential loss
                arising from use of, or inability to use, the website.
              </p>

              <h2>7. User Submissions</h2>
              <p>
                By submitting information through website forms, you confirm that
                the information provided is accurate to the best of your knowledge
                and does not violate the rights of any third party.
              </p>

              <h2>8. Changes to the Website</h2>
              <p>
                We may update, revise, suspend or remove parts of the website or
                its content at any time without prior notice.
              </p>

              <h2>9. Changes to These Terms</h2>
              <p>
                These Terms & Conditions may be revised from time to time. Any
                updated version will be posted on this page.
              </p>

              <h2>10. Contact</h2>
              <p>
                If you have questions about these Terms & Conditions, please contact
                Patak Textile through the website contact page.
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