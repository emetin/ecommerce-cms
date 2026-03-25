type SectionProps = {
  children: React.ReactNode;
  tight?: boolean;
  tone?: "default" | "soft" | "dark";
};

export default function Section({
  children,
  tight = false,
  tone = "default",
}: SectionProps) {
  const className =
    tone === "soft"
      ? `section ${tight ? "section--tight" : ""} section--soft`.trim()
      : tone === "dark"
      ? `section ${tight ? "section--tight" : ""} section--dark`.trim()
      : `section ${tight ? "section--tight" : ""}`.trim();

  return <section className={className}>{children}</section>;
}