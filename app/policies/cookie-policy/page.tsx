

import type { Metadata } from "next";
import Container from "../../../components/ui/Container";
import Section from "../../../components/ui/Section";
import ButtonLink from "../../../components/ui/ButtonLink";
import { buildPageMetadata } from "../../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Cookie Policy",
  description:
    "Review the Patak Textile cookie policy for information about cookies, analytics and browser controls.",
  path: "/policies/cookie-policy",
});

export default function CookiePolicyPage() {
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
              Cookie Policy
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
              Cookie Policy
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
              This Cookie Policy explains how website technologies such as cookies
              may be used on the Patak Textile website.
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
              <h2>1. What Cookies Are</h2>
              <p>
                Cookies are small text files that may be stored on your device when
                you visit a website. They can help websites function correctly,
                remember preferences and support analytics or performance review.
              </p>

              <h2>2. How Cookies May Be Used</h2>
              <p>
                Cookies or similar technologies may be used to support essential
                website functionality, improve user experience, understand traffic
                patterns and review site performance.
              </p>

              <h2>3. Essential Technologies</h2>
              <p>
                Some cookies or related technologies may be necessary for the basic
                operation of the website, including page delivery, form handling,
                security and technical performance.
              </p>

              <h2>4. Analytics and Performance</h2>
              <p>
                We may use analytics or performance-related technologies to better
                understand how visitors interact with the website, which pages are
                viewed and how the experience can be improved.
              </p>

              <h2>5. Third-Party Tools</h2>
              <p>
                Some website features may rely on third-party services that use
                their own cookies or related tracking technologies in connection
                with analytics, hosting, embedded content or other operational
                tools.
              </p>

              <h2>6. Your Choices</h2>
              <p>
                Most browsers allow you to review, block or delete cookies through
                browser settings. Please note that disabling certain technologies
                may affect website functionality or the quality of the browsing
                experience.
              </p>

              <h2>7. Updates</h2>
              <p>
                This Cookie Policy may be revised from time to time. Any updated
                version will be published on this page.
              </p>

              <h2>8. Contact</h2>
              <p>
                If you have questions about this Cookie Policy, please contact
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