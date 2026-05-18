import type { Metadata } from "next";
import "./globals.css";
import AppShell from "../components/layout/AppShell";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.globaltexusa.com"
  ),
  title: "Globaltex Fine Linens",
  description: "Luxury hospitality textiles and premium linen solutions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}