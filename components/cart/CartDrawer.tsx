"use client";

import Link from "next/link";
import { useCart } from "./CartContext";
import { formatMoney } from "../../lib/money";

export default function CartDrawer() {
  const {
    cart,
    isDrawerOpen,
    closeDrawer,
    isLoading,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
  } = useCart();

  const items = cart?.items || [];
  const subtotal = Number(cart?.totals?.subtotal || 0);

  return (
    <>
      {isDrawerOpen ? (
        <div
          onClick={closeDrawer}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 9998,
          }}
        />
      ) : null}

      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "100%",
          maxWidth: "440px",
          background: "#fff",
          zIndex: 9999,
          transform: isDrawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
          boxShadow: "-8px 0 30px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
        }}
        aria-hidden={!isDrawerOpen}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #ececec",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 600,
              color: "#111",
            }}
          >
            Your Cart
          </h3>

          <button
            type="button"
            onClick={closeDrawer}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "26px",
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 20px",
          }}
        >
          {!items.length ? (
            <div style={{ paddingTop: "20px" }}>
              <p style={{ margin: 0, color: "#666", fontSize: "15px" }}>
                Your cart is currently empty.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "18px" }}>
              {items.map((item: any) => {
                const quantity = Number(item.quantity || 1);

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "88px 1fr",
                      gap: "14px",
                      paddingBottom: "18px",
                      borderBottom: "1px solid #f1f1f1",
                    }}
                  >
                    <div
                      style={{
                        width: "88px",
                        height: "88px",
                        borderRadius: "10px",
                        overflow: "hidden",
                        background: "#f7f7f7",
                      }}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.product_title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : null}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "#111",
                          marginBottom: "4px",
                        }}
                      >
                        {item.product_title}
                      </div>

                      {item.variant_title ? (
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#777",
                            marginBottom: "8px",
                          }}
                        >
                          {item.variant_title}
                        </div>
                      ) : null}

                      <div
                        style={{
                          fontSize: "14px",
                          color: "#222",
                          marginBottom: "10px",
                        }}
                      >
                        {formatMoney(item.unit_price)}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "10px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQuantity(item.id, quantity - 1)
                          }
                          disabled={isLoading}
                          style={qtyButtonStyle}
                        >
                          -
                        </button>

                        <span
                          style={{
                            minWidth: "24px",
                            textAlign: "center",
                            fontSize: "14px",
                          }}
                        >
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQuantity(item.id, quantity + 1)
                          }
                          disabled={isLoading}
                          style={qtyButtonStyle}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isLoading}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          cursor: "pointer",
                          fontSize: "13px",
                          color: "#777",
                          textDecoration: "underline",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid #ececec",
            padding: "18px 20px 22px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#111",
            }}
          >
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <Link
              href="/cart"
              onClick={closeDrawer}
              style={{
                display: "block",
                textAlign: "center",
                padding: "14px 18px",
                background: "#111",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              View Cart
            </Link>

            {!!items.length ? (
              <button
                type="button"
                onClick={handleClearCart}
                disabled={isLoading}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "13px 18px",
                  background: "#fff",
                  color: "#111",
                  border: "1px solid #d9d9d9",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Clear Cart
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}

const qtyButtonStyle: React.CSSProperties = {
  width: "30px",
  height: "30px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontSize: "16px",
  lineHeight: 1,
};