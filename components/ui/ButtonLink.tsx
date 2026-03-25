import Link from "next/link";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent";
};

export default function ButtonLink({
  href,
  children,
  variant = "primary",
}: ButtonLinkProps) {
  const className =
    variant === "secondary"
      ? "button-link btn-secondary"
      : variant === "accent"
      ? "button-link btn-accent"
      : "button-link btn-primary";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}