"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { useCart } from "./CartContext";
import { formatMoney } from "../../lib/money";

type CartItem = {
  id: string;
  product_title?: string;
  variant_title?: string;
  image?: string;
  unit_price?: number | string;
  quantity?: number | string;
  line_total?: number | string;
  sku?: string;

  min_quantity?: number | string;
  box_quantity?: number | string;
  case_quantity?: number | string;
  step_quantity?: number | string;

  min_quantity_number?: number;
  box_quantity_number?: number;
  case_quantity_number?: number;
  step_quantity_number?: number;
};

type QuantityRule = {
  minQuantity: number;
  boxQuantity: number;
  caseQuantity: number;
  stepQuantity: number;
  message: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
}

function toSafeMoneyNumber(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function getQuantityRule(item: CartItem): QuantityRule {
  const minQuantity =
    toPositiveInteger(item.min_quantity_number, 0) ||
    toPositiveInteger(item.min_quantity, 0) ||
    1;

  const boxQuantity =
    toPositiveInteger(item.box_quantity_number, 0) ||
    toPositiveInteger(item.box_quantity, 0) ||
    0;

  const caseQuantity =
    toPositiveInteger(item.case_quantity_number, 0) ||
    toPositiveInteger(item.case_quantity, 0) ||
    0;

  const stepQuantity =
    toPositiveInteger(item.step_quantity_number, 0) ||
    toPositiveInteger(item.step_quantity, 0) ||
    caseQuantity ||
    boxQuantity ||
    minQuantity ||
    1;

  let message = "";

  if (caseQuantity > 0) {
    message = `Case multiple: ${caseQuantity}`;
  } else if (boxQuantity > 0) {
    message = `Box multiple: ${boxQuantity}`;
  } else if (stepQuantity > 1) {
    message = `Step: ${stepQuantity}`;
  } else if (minQuantity > 1) {
    message = `Minimum: ${minQuantity}`;
  }

  return {
    minQuantity,
    boxQuantity,
    caseQuantity,
    stepQuantity,
    message,
  };
}

function normalizeQuantityToRule(quantity: number, rule: QuantityRule) {
  const safeQuantity = Math.max(
    rule.minQuantity,
    Math.floor(Number(quantity) || rule.minQuantity)
  );

  const remainder = (safeQuantity - rule.minQuantity) % rule.stepQuantity;

  if (remainder === 0) {
    return safeQuantity;
  }

  return safeQuantity + (rule.stepQuantity - remainder);
}

function getCurrentQuantity(item: CartItem, rule: QuantityRule) {
  const current = Math.floor(Number(item.quantity || rule.minQuantity));

  if (!Number.isFinite(current) || current <= 0) {
    return rule.minQuantity;
  }

  return normalizeQuantityToRule(current, rule);
}

function getNextDecreaseQuantity(quantity: number, rule: QuantityRule) {
  const next = quantity - rule.stepQuantity;

  if (next < rule.minQuantity) {
    return rule.minQuantity;
  }

  return normalizeQuantityToRule(next, rule);
}

function getNextIncreaseQuantity(quantity: number, rule: QuantityRule) {
  return normalizeQuantityToRule(quantity + rule.stepQuantity, rule);
}

function isTechnicalCartError(message: string) {
  const normalized = String(message || "").toLowerCase();

  return (
    normalized.includes("cart not found") ||
    normalized.includes("cart token not found") ||
    normalized.includes("cart row could not be found")
  );
}

function CartDrawerComponent() {
  const {
    cart,
    isDrawerOpen,
    closeDrawer,
    isUpdating,
    error,
    clearError,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
  } = useCart();

  const items = useMemo(() => {
    return Array.isArray(cart?.items) ? (cart.items as CartItem[]) : [];
  }, [cart]);

  const subtotal = useMemo(() => {
    return Number(cart?.totals?.subtotal || 0);
  }, [cart]);

  const itemCount = useMemo(() => {
    return Number(cart?.totals?.item_count || 0);
  }, [cart]);

  const visibleError = error && !isTechnicalCartError(error) ? error : "";

  async function safelyClearCart() {
    try {
      clearError();
      await handleClearCart();
    } catch {
      // Shared cart error is rendered inside drawer.
    }
  }

  function closeCartDrawer() {
    clearError();
    closeDrawer();
  }

  return (
    <>
      {isDrawerOpen ? <div onClick={closeCartDrawer} style={overlayStyle} /> : null}

      <aside
        style={{
          ...drawerStyle,
          transform: isDrawerOpen ? "translateX(0)" : "translateX(100%)",
          pointerEvents: isDrawerOpen ? "auto" : "none",
        }}
        aria-hidden={!isDrawerOpen}
        aria-label="Quote cart drawer"
      >
        <div style={headerStyle}>
          <div>
            <h3 style={titleStyle}>Quote Cart</h3>

            <p style={subtitleStyle}>
              Review selected products before submitting a B2B quote request.
            </p>
          </div>

          <button
            type="button"
            onClick={closeCartDrawer}
            aria-label="Close quote cart"
            style={closeButtonStyle}
          >
            ×
          </button>
        </div>

        <div style={bodyStyle}>
          {visibleError ? <div style={errorBoxStyle}>{visibleError}</div> : null}

          {!items.length ? (
            <div style={emptyBoxStyle}>
              <p style={emptyTextStyle}>
                Your quote cart is currently empty. Add products from the
                catalog to start a wholesale request.
              </p>

              <Link href="/collections" onClick={closeCartDrawer} style={emptyLinkStyle}>
                Browse Collections
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {items.map((item) => (
                <CartDrawerItem
                  key={item.id}
                  item={item}
                  isUpdating={isUpdating}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                  clearError={clearError}
                />
              ))}
            </div>
          )}
        </div>

        <div style={footerStyle}>
          <div style={summaryWrapStyle}>
            <div style={summaryRowStyle}>
              <span>Items</span>
              <strong>{itemCount}</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Estimated Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
          </div>

          <div style={noticeStyle}>
            Final pricing, freight, availability, and payment terms will be
            reviewed by the Globaltex sales team.
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <Link href="/cart" onClick={closeCartDrawer} style={secondaryLinkStyle}>
              View Quote Cart
            </Link>

            {items.length ? (
              <Link href="/checkout" onClick={closeCartDrawer} style={primaryLinkStyle}>
                Submit Quote Request
              </Link>
            ) : null}

            {items.length ? (
              <button
                type="button"
                onClick={safelyClearCart}
                disabled={isUpdating}
                style={{
                  ...clearButtonStyle,
                  cursor: isUpdating ? "not-allowed" : "pointer",
                  opacity: isUpdating ? 0.65 : 1,
                }}
              >
                {isUpdating ? "Updating..." : "Clear Quote Cart"}
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}

function CartDrawerItemComponent({
  item,
  isUpdating,
  onUpdateQuantity,
  onRemoveItem,
  clearError,
}: {
  item: CartItem;
  isUpdating: boolean;
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  clearError: () => void;
}) {
  const quantityRule = useMemo(() => getQuantityRule(item), [item]);
  const quantity = getCurrentQuantity(item, quantityRule);

  const itemPrice = toSafeMoneyNumber(item.unit_price);
  const lineTotal = toSafeMoneyNumber(item.line_total || itemPrice * quantity);

  const imageUrl = normalizeText(item.image);

  const nextDecreaseQuantity = getNextDecreaseQuantity(quantity, quantityRule);
  const nextIncreaseQuantity = getNextIncreaseQuantity(quantity, quantityRule);

  async function safelyUpdateQuantity(nextQuantity: number) {
    try {
      clearError();

      if (nextQuantity === quantity) {
        return;
      }

      await onUpdateQuantity(item.id, nextQuantity);
    } catch {
      // Shared cart error is rendered by drawer parent.
    }
  }

  async function safelyRemoveItem() {
    try {
      clearError();
      await onRemoveItem(item.id);
    } catch {
      // Shared cart error is rendered by drawer parent.
    }
  }

  return (
    <div style={itemWrapStyle}>
      <div style={imageWrapStyle}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.product_title || "Product"}
            loading="lazy"
            decoding="async"
            style={imageStyle}
          />
        ) : (
          <div style={imagePlaceholderStyle}>No Image</div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={itemTitleStyle}>{item.product_title || "Product"}</div>

        {item.variant_title ? (
          <div style={variantTextStyle}>{item.variant_title}</div>
        ) : null}

        {item.sku ? <div style={skuTextStyle}>SKU: {item.sku}</div> : null}

        <div style={priceTextStyle}>
          Unit: {formatMoney(itemPrice)}
          <br />
          Line: <strong>{formatMoney(lineTotal)}</strong>
        </div>

        <div style={ruleTextStyle}>
          Min: {quantityRule.minQuantity} · Step: {quantityRule.stepQuantity}
          {quantityRule.message ? <> · {quantityRule.message}</> : null}
        </div>

        <div style={quantityRowStyle}>
          <button
            type="button"
            onClick={() => safelyUpdateQuantity(nextDecreaseQuantity)}
            disabled={isUpdating || quantity <= quantityRule.minQuantity}
            style={{
              ...qtyButtonStyle,
              opacity: isUpdating || quantity <= quantityRule.minQuantity ? 0.65 : 1,
              cursor:
                isUpdating || quantity <= quantityRule.minQuantity
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            -
          </button>

          <span style={qtyValueStyle}>{quantity}</span>

          <button
            type="button"
            onClick={() => safelyUpdateQuantity(nextIncreaseQuantity)}
            disabled={isUpdating}
            style={{
              ...qtyButtonStyle,
              opacity: isUpdating ? 0.65 : 1,
              cursor: isUpdating ? "not-allowed" : "pointer",
            }}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={safelyRemoveItem}
          disabled={isUpdating}
          style={{
            ...removeButtonStyle,
            cursor: isUpdating ? "not-allowed" : "pointer",
            opacity: isUpdating ? 0.65 : 1,
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

const CartDrawerItem = memo(CartDrawerItemComponent);

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.42)",
  zIndex: 9998,
};

const drawerStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  height: "100vh",
  width: "100%",
  maxWidth: 460,
  background: "#fff",
  zIndex: 9999,
  transition: "transform 0.25s ease",
  boxShadow: "-10px 0 40px rgba(0,0,0,0.16)",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  padding: "20px 22px",
  borderBottom: "1px solid #ece3d7",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 21,
  fontWeight: 850,
  color: "#171717",
  lineHeight: 1.2,
};

const subtitleStyle: React.CSSProperties = {
  margin: "7px 0 0",
  fontSize: 13,
  lineHeight: 1.5,
  color: "#6f665b",
};

const closeButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: 30,
  lineHeight: 1,
  cursor: "pointer",
  color: "#171717",
  padding: 0,
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px 22px",
  background: "#fffaf4",
};

const emptyBoxStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 18,
  border: "1px solid #eee5d9",
  background: "#fff",
};

const emptyTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#5d554a",
  fontSize: 15,
  lineHeight: 1.7,
};

const emptyLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 999,
  background: "#171717",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 14,
  border: "1px solid #171717",
  marginTop: 16,
};

const errorBoxStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #f1c7c7",
  background: "#fff4f4",
  color: "#9b2c2c",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.6,
  marginBottom: 16,
};

const footerStyle: React.CSSProperties = {
  borderTop: "1px solid #ece3d7",
  padding: "18px 22px 22px",
  background: "#fff",
};

const summaryWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginBottom: 16,
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 15,
  color: "#171717",
};

const noticeStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  background: "#f8f5ef",
  border: "1px solid #eee5d9",
  color: "#6b6256",
  fontSize: 13,
  lineHeight: 1.6,
  marginBottom: 14,
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  padding: "0 20px",
  borderRadius: 999,
  background: "#171717",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 850,
  fontSize: 14,
  border: "1px solid #171717",
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  padding: "0 20px",
  borderRadius: 999,
  background: "#fff",
  color: "#171717",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 14,
  border: "1px solid #ddd3c5",
};

const clearButtonStyle: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  minHeight: 50,
  padding: "0 18px",
  background: "#fff",
  color: "#171717",
  border: "1px solid #ddd3c5",
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 700,
};

const itemWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "92px 1fr",
  gap: 14,
  padding: 14,
  border: "1px solid #eee5d9",
  borderRadius: 18,
  background: "#fff",
};

const imageWrapStyle: React.CSSProperties = {
  width: 92,
  height: 92,
  borderRadius: 14,
  overflow: "hidden",
  background: "#f7f4ef",
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const imagePlaceholderStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  color: "#9b9288",
  fontSize: 11,
  fontWeight: 700,
};

const itemTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 850,
  color: "#171717",
  marginBottom: 5,
  lineHeight: 1.35,
};

const variantTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7b7367",
  marginBottom: 6,
  lineHeight: 1.45,
};

const skuTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#8a8176",
  marginBottom: 8,
  lineHeight: 1.45,
};

const priceTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#5d554a",
  marginBottom: 8,
  lineHeight: 1.5,
};

const ruleTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#7b7367",
  marginBottom: 10,
  lineHeight: 1.45,
  fontWeight: 700,
};

const quantityRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 10,
};

const qtyButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 9,
  border: "1px solid #ddd3c5",
  background: "#fff",
  fontSize: 16,
  lineHeight: 1,
  color: "#171717",
};

const qtyValueStyle: React.CSSProperties = {
  minWidth: 28,
  textAlign: "center",
  fontSize: 14,
  fontWeight: 850,
  color: "#171717",
};

const removeButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  fontSize: 13,
  color: "#7b7367",
  textDecoration: "underline",
};

export default memo(CartDrawerComponent);