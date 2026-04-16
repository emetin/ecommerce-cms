"use client";

import Link from "next/link";
import { useCart } from "./CartContext";
import { formatMoney } from "../../lib/money";

export default function CartPageClient() {
  const {
    cart,
    isLoading,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
  } = useCart();

  const items = cart?.items || [];
  const subtotal = Number(cart?.totals?.subtotal || 0);
  const itemCount = Number(cart?.totals?.item_count || 0);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "36px",
            lineHeight: 1.2,
            color: "#111",
          }}
        >
          Shopping Cart
        </h1>
      </div>

      {!items.length ? (
        <div
          style={{
            border: "1px solid #ececec",
            borderRadius: "16px",
            padding: "30px",
            background: "#fff",
          }}
        >
          <p style={{ marginTop: 0, fontSize: "16px", color: "#666" }}>
            Your cart is empty.
          </p>

          <Link
            href="/collections"
            style={{
              display: "inline-block",
              padding: "12px 18px",
              borderRadius: "10px",
              background: "#111",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 380px",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              border: "1px solid #ececec",
              borderRadius: "16px",
              background: "#fff",
              overflow: "hidden",
            }}
          >
            {items.map((item: any, index: number) => {
              const quantity = Number(item.quantity || 1);

              return (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr auto",
                    gap: "18px",
                    padding: "20px",
                    borderBottom:
                      index === items.length - 1 ? "none" : "1px solid #f1f1f1",
                  }}
                >
                  <div
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "12px",
                      background: "#f7f7f7",
                      overflow: "hidden",
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
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "#111",
                        marginBottom: "6px",
                      }}
                    >
                      {item.product_title}
                    </div>

                    {item.variant_title ? (
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#777",
                          marginBottom: "10px",
                        }}
                      >
                        {item.variant_title}
                      </div>
                    ) : null}

                    <div
                      style={{
                        fontSize: "15px",
                        color: "#111",
                        marginBottom: "14px",
                      }}
                    >
                      Unit Price: {formatMoney(item.unit_price)}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "14px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, quantity - 1)}
                        disabled={isLoading}
                        style={qtyButtonStyle}
                      >
                        -
                      </button>

                      <span
                        style={{
                          minWidth: "24px",
                          textAlign: "center",
                          fontSize: "15px",
                        }}
                      >
                        {quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, quantity + 1)}
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
                        fontSize: "14px",
                        color: "#777",
                        textDecoration: "underline",
                      }}
                    >
                      Remove item
                    </button>
                  </div>

                  <div
                    style={{
                      minWidth: "120px",
                      textAlign: "right",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#111",
                    }}
                  >
                    {formatMoney(item.line_total)}
                  </div>
                </div>
              );
            })}
          </div>

          <aside
            style={{
              border: "1px solid #ececec",
              borderRadius: "16px",
              background: "#fff",
              padding: "22px",
              position: "sticky",
              top: "20px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: "20px",
                fontSize: "22px",
                color: "#111",
              }}
            >
              Summary
            </h2>

            <div
              style={{
                display: "grid",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "15px",
                  color: "#444",
                }}
              >
                <span>Items</span>
                <span>{itemCount}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "15px",
                  color: "#444",
                }}
              >
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "16px",
                borderTop: "1px solid #ececec",
                marginBottom: "20px",
                fontSize: "18px",
                fontWeight: 700,
                color: "#111",
              }}
            >
              <span>Total</span>
              <span>{formatMoney(subtotal)}</span>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <Link
                href="/checkout"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#111",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Proceed to Checkout
              </Link>

              <Link
                href="/order-request"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  border: "1px solid #d9d9d9",
                  background: "#fff",
                  color: "#111",
                  fontSize: "14px",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Request Quote
              </Link>

              <button
                type="button"
                onClick={handleClearCart}
                disabled={isLoading}
                style={{
                  padding: "13px 18px",
                  borderRadius: "10px",
                  border: "1px solid #d9d9d9",
                  background: "#fff",
                  color: "#111",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Clear Cart
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

const qtyButtonStyle: React.CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontSize: "16px",
  lineHeight: 1,
};