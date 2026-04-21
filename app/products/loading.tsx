import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";

export default function Loading() {
  return (
    <Section>
      <Container>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 42,
            alignItems: "start",
          }}
        >
          <div
            style={{
              width: "100%",
              minHeight: 560,
              borderRadius: 24,
              border: "1px solid #e7ddcf",
              background: "#f8f4ed",
            }}
          />

          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            <div
              style={{
                height: 32,
                width: 140,
                borderRadius: 999,
                background: "#f3ede3",
              }}
            />
            <div
              style={{
                height: 56,
                width: "80%",
                borderRadius: 16,
                background: "#f6f2eb",
              }}
            />
            <div
              style={{
                height: 120,
                width: "100%",
                borderRadius: 20,
                background: "#faf7f1",
              }}
            />
            <div
              style={{
                height: 220,
                width: "100%",
                borderRadius: 24,
                background: "#fffaf4",
                border: "1px solid #e7ddcf",
              }}
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}