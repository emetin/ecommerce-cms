type SectionHeadingProps = {
  kicker?: string;
  title: string;
  text?: string;
  align?: "left" | "center";
};

export default function SectionHeading({
  kicker,
  title,
  text,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div
      className={`section-heading ${
        align === "center" ? "section-heading--center" : ""
      }`.trim()}
    >
      {kicker ? <div className="section-heading__kicker">{kicker}</div> : null}

      <h2 className="section-heading__title">{title}</h2>

      {text ? <p className="section-heading__text">{text}</p> : null}
    </div>
  );
}