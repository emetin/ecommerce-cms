import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";

export default function Loading() {
  return (
    <Section>
      <Container>
        <div className="cards-grid cards-grid--3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              style={{
                borderRadius: 20,
                overflow: "hidden",
                border: "1px solid #e5dbcf",
                background: "#fff",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 0.82",
                  background: "#f6f2eb",
                }}
              />
              <div
                style={{
                  padding: 18,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    height: 24,
                    width: "65%",
                    borderRadius: 10,
                    background: "#f3ede3",
                  }}
                />
                <div
                  style={{
                    height: 52,
                    width: "100%",
                    borderRadius: 12,
                    background: "#faf7f1",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}