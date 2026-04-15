"use client";

import { useCart } from "./CartContext";

export default function CartButton() {
  const { itemCount, openDrawer } = useCart();

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label="Open cart"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "44px",
        height: "44px",
        borderRadius: "999px",
        border: "1px solid #e5e5e5",
        background: "#fff",
        cursor: "pointer",
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 4H5L7.4 14.4C7.6 15.3 8.4 16 9.3 16H17.8C18.7 16 19.5 15.4 19.7 14.5L21 8H6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="20" r="1.4" fill="currentColor" />
        <circle cx="18" cy="20" r="1.4" fill="currentColor" />
      </svg>

      {itemCount > 0 ? (
        <span
          style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            minWidth: "20px",
            height: "20px",
            padding: "0 6px",
            borderRadius: "999px",
            background: "#111",
            color: "#fff",
            fontSize: "11px",
            fontWeight: 700,
            lineHeight: "20px",
            textAlign: "center",
          }}
        >
          {itemCount}
        </span>
      ) : null}
    </button>
  );
}