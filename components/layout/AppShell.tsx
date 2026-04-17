"use client";

import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";
import { CartProvider } from "../cart/CartContext";
import CartDrawer from "../cart/CartDrawer";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAdminRoute =
    pathname === "/portal-ptx-admin" || pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <CartProvider>
      <Header />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
    </CartProvider>
  );
}