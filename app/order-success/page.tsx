import Link from "next/link";

type OrderSuccessPageProps = {
  searchParams?: Promise<{
    order?: string;
  }>;
};

export default async function OrderSuccessPage({
  searchParams,
}: OrderSuccessPageProps) {
  const resolvedSearchParams = await searchParams;
  const orderNumber = resolvedSearchParams?.order || "";

  const detailHref = orderNumber
    ? `/account/orders/${encodeURIComponent(orderNumber)}`
    : "/account/orders";

  return (
    <main style={mainStyle}>
      <section style={cardStyle}>
        <div style={successBadgeStyle}>Quote Request Received</div>

        <h1 style={titleStyle}>
          Thank you. Your B2B quote request has been submitted successfully.
        </h1>

        <p style={textStyle}>
          Your request has been received by Globaltex Fine Linens. No online
          payment has been collected at this stage. Our sales team will review
          your selected products, quantities, availability, freight details, lead
          time, and applicable wholesale pricing before following up with you.
        </p>

        <div style={quoteBoxStyle}>
          <div style={quoteLabelStyle}>Quote Request Number</div>

          <div style={quoteNumberStyle}>{orderNumber || "-"}</div>
        </div>

        <div style={nextStepBoxStyle}>
          <h2 style={nextStepTitleStyle}>What happens next?</h2>

          <div style={stepGridStyle}>
            <StepCard
              number="01"
              title="Request Review"
              text="Our team checks product availability, quantities, and project requirements."
            />

            <StepCard
              number="02"
              title="Pricing & Freight"
              text="Wholesale pricing, freight, lead time, and terms are reviewed based on your request."
            />

            <StepCard
              number="03"
              title="Sales Follow-up"
              text="A Globaltex representative follows up with the next steps for approval or revision."
            />
          </div>
        </div>

        <div style={noticeStyle}>
          Please keep your quote request number for future reference. You can
          review submitted requests from your customer account.
        </div>

        <div style={actionsStyle}>
          <Link href={detailHref} style={primaryButtonStyle}>
            View Quote Request
          </Link>

          <Link href="/account/orders" style={secondaryButtonStyle}>
            My Quote Requests
          </Link>

          <Link href="/collections" style={secondaryButtonStyle}>
            Continue Browsing
          </Link>
        </div>
      </section>
    </main>
  );
}

function StepCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div style={stepCardStyle}>
      <div style={stepNumberStyle}>{number}</div>
      <h3 style={stepTitleStyle}>{title}</h3>
      <p style={stepTextStyle}>{text}</p>
    </div>
  );
}

const mainStyle: React.CSSProperties = {
  maxWidth: 1040,
  margin: "0 auto",
  padding: "60px 20px 100px",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e7ddcf",
  background: "#fff",
  borderRadius: 28,
  padding: 34,
  display: "grid",
  gap: 20,
  boxShadow: "0 14px 40px rgba(23,23,23,0.05)",
};

const successBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 14px",
  borderRadius: 999,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontWeight: 850,
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(2rem, 4vw, 3.35rem)",
  lineHeight: 1.05,
  color: "#171717",
  fontWeight: 850,
  letterSpacing: "-0.04em",
  maxWidth: 920,
};

const textStyle: React.CSSProperties = {
  margin: 0,
  color: "#5d554a",
  lineHeight: 1.8,
  fontSize: 16,
  maxWidth: 850,
};

const quoteBoxStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 20,
  background: "#f8f5ef",
  border: "1px solid #e5ddd2",
  color: "#171717",
};

const quoteLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 850,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#7a7166",
  marginBottom: 8,
};

const quoteNumberStyle: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 850,
  lineHeight: 1.1,
  color: "#171717",
};

const nextStepBoxStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const nextStepTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 22,
  lineHeight: 1.2,
  fontWeight: 850,
};

const stepGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
};

const stepCardStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background: "#fffaf4",
  border: "1px solid #eee5d9",
};

const stepNumberStyle: React.CSSProperties = {
  width: "fit-content",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#171717",
  color: "#fff",
  fontSize: 12,
  fontWeight: 850,
  marginBottom: 10,
};

const stepTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 16,
  lineHeight: 1.3,
  fontWeight: 850,
};

const stepTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#5d554a",
  fontSize: 13,
  lineHeight: 1.7,
};

const noticeStyle: React.CSSProperties = {
  padding: "13px 14px",
  borderRadius: 16,
  background: "#fff8e7",
  border: "1px solid #eadbb5",
  color: "#6b5530",
  fontSize: 14,
  lineHeight: 1.7,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 4,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  padding: "0 22px",
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 850,
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  padding: "0 22px",
  borderRadius: 999,
  border: "1px solid #ddd3c5",
  background: "#fff",
  color: "#171717",
  textDecoration: "none",
  fontWeight: 800,
};