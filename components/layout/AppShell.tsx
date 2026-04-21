"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";
import { CartProvider } from "../cart/CartContext";

const CartDrawer = dynamic(() => import("../cart/CartDrawer"), {
  ssr: false,
});

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