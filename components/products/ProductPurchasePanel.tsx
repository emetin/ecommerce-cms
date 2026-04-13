"use client";

import { useEffect, useMemo, useState } from "react";
import { addToDraftOrder } from "../b2b/order-draft";

export type VariantItem = {
  id?: string;
  product_slug?: string;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  sku?: string;
  barcode?: string;
  price?: string;
  compare_at_price?: string;
  price_standard?: string;
  price_wholesale?: string;
  price_distributor?: string;
  price_vip?: string;
  inventory_tracker?: string;
  inventory_policy?: string;
  fulfillment_service?: string;
  requires_shipping?: string;
  taxable?: string;
  variant_image?: string;
  image_id?: string;
  weight?: string;
  weight_unit?: string;
  box_quantity?: string;
  min_order_quantity?: string;
  quantity_step?: string;
  inventory_quantity?: string;
  is_available?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type ProductPurchasePanelProps = {
  product: {
    title?: string;
    slug?: string;
    image?: string;
  };
  variants: VariantItem[];
  onVariantChange?: (variant: VariantItem | null) => void;
};

type CustomerSession = {
  customerId: string;
  email: string;
  companyName: string;
  priceTier: string;
  currency: string;
};

function parsePrice(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/[^\d.,-]/g, "");
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  }

  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(value || 0);
}

function normalize(value?: string) {
  return String(value || "").trim();
}

function normalizeLower(value?: string) {
  return normalize(value).toLowerCase();
}

function isMeaningfulValue(value?: string) {
  const normalized = normalizeLower(value);
  return Boolean(normalized) && normalized !== "default";
}

function buildVariantLabel(variant: VariantItem) {
  const values = [
    variant.option1_value,
    variant.option2_value,
    variant.option3_value,
  ]
    .map((item) => normalize(item))
    .filter((item) => item && item.toLowerCase() !== "default");

  return values.length ? values.join(" / ") : "Default";
}

function getOptionMeta(
  variants: VariantItem[],
  optionNameKey: "option1_name" | "option2_name" | "option3_name",
  optionValueKey: "option1_value" | "option2_value" | "option3_value"
) {
  const optionName =
    normalize(
      variants.find((variant) => isMeaningfulValue(variant[optionValueKey]))?.[
        optionNameKey
      ]
    ) || "";

  const values = Array.from(
    new Set(
      variants
        .map((variant) => normalize(variant[optionValueKey]))
        .filter((value) => isMeaningfulValue(value))
    )
  );

  return {
    optionName,
    values,
  };
}

function filterOutDefaultVariantsWhenRealOnesExist(variants: VariantItem[]) {
  const hasRealVariant = variants.some(
    (variant) =>
      isMeaningfulValue(variant.option1_value) ||
      isMeaningfulValue(variant.option2_value) ||
      isMeaningfulValue(variant.option3_value)
  );

  if (!hasRealVariant) {
    return variants;
  }

  return variants.filter(
    (variant) =>
      isMeaningfulValue(variant.option1_value) ||
      isMeaningfulValue(variant.option2_value) ||
      isMeaningfulValue(variant.option3_value)
  );
}

function toSafeInt(value: unknown, fallback = 1) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback;
}

function resolveCustomerPrice(variant: VariantItem | null, priceTier?: string) {
  if (!variant) return 0;

  const tier = normalizeLower(priceTier || "standard");

  if (tier === "vip") {
    return (
      parsePrice(variant.price_vip) ||
      parsePrice(variant.price_wholesale) ||
      parsePrice(variant.price_standard) ||
      parsePrice(variant.price)
    );
  }

  if (tier === "distributor") {
    return (
      parsePrice(variant.price_distributor) ||
      parsePrice(variant.price_wholesale) ||
      parsePrice(variant.price_standard) ||
      parsePrice(variant.price)
    );
  }

  if (tier === "wholesale") {
    return (
      parsePrice(variant.price_wholesale) ||
      parsePrice(variant.price_standard) ||
      parsePrice(variant.price)
    );
  }

  return parsePrice(variant.price_standard) || parsePrice(variant.price);
}

function isVariantAvailable(variant: VariantItem | null) {
  if (!variant) return false;

  const availability = normalizeLower(variant.is_available);

  if (!availability) return true;

  return ["true", "yes", "available", "active", "in-stock"].includes(availability);
}

export default function ProductPurchasePanel({
  product,
  variants,
  onVariantChange,
}: ProductPurchasePanelProps) {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const activeVariants = useMemo(() => {
    const published = variants.filter((variant) =>
      ["", "published", "active"].includes(normalizeLower(variant.status))
    );

    const pool = published.length ? published : variants;
    return filterOutDefaultVariantsWhenRealOnesExist(pool);
  }, [variants]);

  const option1 = useMemo(
    () => getOptionMeta(activeVariants, "option1_name", "option1_value"),
    [activeVariants]
  );

  const option2 = useMemo(
    () => getOptionMeta(activeVariants, "option2_name", "option2_value"),
    [activeVariants]
  );

  const option3 = useMemo(
    () => getOptionMeta(activeVariants, "option3_name", "option3_value"),
    [activeVariants]
  );

  const [selectedOption1, setSelectedOption1] = useState("");
  const [selectedOption2, setSelectedOption2] = useState("");
  const [selectedOption3, setSelectedOption3] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelectedOption1(option1.values[0] || "");
    setSelectedOption2("");
    setSelectedOption3("");
  }, [option1.values]);

  useEffect(() => {
    async function loadCustomer() {
      try {
        setCustomerLoading(true);

        const response = await fetch("/api/customer-auth/me", {
          cache: "no-store",
        });

        const data = await response.json();

        if (response.ok && data?.authenticated) {
          setCustomer(data.customer || null);
        } else {
          setCustomer(null);
        }
      } catch {
        setCustomer(null);
      } finally {
        setCustomerLoading(false);
      }
    }

    loadCustomer();
  }, []);

  const availableOption2Values = useMemo(() => {
    if (!option2.values.length) return [];

    const scoped = activeVariants.filter((variant) => {
      if (!option1.values.length) return true;
      return normalize(variant.option1_value) === selectedOption1;
    });

    return Array.from(
      new Set(
        scoped
          .map((variant) => normalize(variant.option2_value))
          .filter((value) => isMeaningfulValue(value))
      )
    );
  }, [activeVariants, option1.values.length, option2.values.length, selectedOption1]);

  const availableOption3Values = useMemo(() => {
    if (!option3.values.length) return [];

    const scoped = activeVariants.filter((variant) => {
      const option1Matches =
        !option1.values.length || normalize(variant.option1_value) === selectedOption1;

      const option2Matches =
        !option2.values.length ||
        !availableOption2Values.length ||
        normalize(variant.option2_value) === selectedOption2;

      return option1Matches && option2Matches;
    });

    return Array.from(
      new Set(
        scoped
          .map((variant) => normalize(variant.option3_value))
          .filter((value) => isMeaningfulValue(value))
      )
    );
  }, [
    activeVariants,
    option1.values.length,
    option2.values.length,
    option3.values.length,
    selectedOption1,
    selectedOption2,
    availableOption2Values.length,
  ]);

  useEffect(() => {
    if (!option2.values.length) {
      setSelectedOption2("");
      return;
    }

    setSelectedOption2((prev) =>
      availableOption2Values.includes(prev) ? prev : availableOption2Values[0] || ""
    );
  }, [option2.values.length, availableOption2Values]);

  useEffect(() => {
    if (!option3.values.length) {
      setSelectedOption3("");
      return;
    }

    setSelectedOption3((prev) =>
      availableOption3Values.includes(prev) ? prev : availableOption3Values[0] || ""
    );
  }, [option3.values.length, availableOption3Values]);

  const selectedVariant = useMemo(() => {
    if (!activeVariants.length) return null;

    const found = activeVariants.find((variant) => {
      const v1 = normalize(variant.option1_value);
      const v2 = normalize(variant.option2_value);
      const v3 = normalize(variant.option3_value);

      const option1Matches = !option1.values.length || v1 === selectedOption1;
      const option2Matches = !option2.values.length || v2 === selectedOption2;
      const option3Matches = !option3.values.length || v3 === selectedOption3;

      return option1Matches && option2Matches && option3Matches;
    });

    return found || activeVariants[0] || null;
  }, [
    activeVariants,
    option1.values.length,
    option2.values.length,
    option3.values.length,
    selectedOption1,
    selectedOption2,
    selectedOption3,
  ]);

  useEffect(() => {
    onVariantChange?.(selectedVariant);
  }, [selectedVariant, onVariantChange]);

  const minOrderQuantity = toSafeInt(selectedVariant?.min_order_quantity, 1);
  const quantityStep = toSafeInt(selectedVariant?.quantity_step, 1);

  useEffect(() => {
    setQuantity(minOrderQuantity);
  }, [minOrderQuantity, selectedVariant?.id]);

  const unitPrice = resolveCustomerPrice(selectedVariant, customer?.priceTier);
  const compareAtPrice = parsePrice(selectedVariant?.compare_at_price);
  const hasDiscount = compareAtPrice > unitPrice && unitPrice > 0;
  const discountPercent = hasDiscount
    ? Math.round(((compareAtPrice - unitPrice) / compareAtPrice) * 100)
    : 0;

  const available = isVariantAvailable(selectedVariant);

  function increaseQty() {
    setQuantity((prev) => prev + quantityStep);
  }

  function decreaseQty() {
    setQuantity((prev) => Math.max(minOrderQuantity, prev - quantityStep));
  }

  function handleManualQty(value: string) {
    const next = Number(value || minOrderQuantity);

    if (!Number.isFinite(next) || next <= 0) {
      setQuantity(minOrderQuantity);
      return;
    }

    setQuantity(Math.max(minOrderQuantity, Math.floor(next)));
  }

  function handleAddToDraft() {
    if (!customer) {
      return;
    }

    if (!selectedVariant) {
      setFeedbackMessage("Please select a valid variant.");
      return;
    }

    if (!available) {
      setFeedbackMessage("This variant is currently unavailable.");
      return;
    }

    addToDraftOrder({
      productSlug: String(product.slug || ""),
      productTitle: String(product.title || "Product"),
      variantId: String(selectedVariant.id || ""),
      variantLabel: buildVariantLabel(selectedVariant),
      sku: String(selectedVariant.sku || ""),
      image: String(
        selectedVariant.variant_image || selectedVariant.image_id || product.image || ""
      ),
      unitPrice,
      quantity,
      minOrderQuantity,
      quantityStep,
      lineTotal: unitPrice * quantity,
    });

    setFeedbackMessage("Added to draft order.");
  }

  if (!activeVariants.length) {
    return (
      <div style={panelStyle}>
        <div style={headlineStyle}>Wholesale access required</div>
        <div style={descriptionStyle}>
          This product is available through our approved B2B customer portal.
          Please apply for an account or contact our sales team.
        </div>

        <div style={actionGridStyle}>
          <a href="/apply-for-account" style={primaryLinkStyle}>
            Apply for Account
          </a>
          <a href="/portal-login" style={secondaryLinkStyle}>
            Customer Login
          </a>
        </div>
      </div>
    );
  }

  if (customerLoading) {
    return <div style={panelStyle}>Loading customer pricing...</div>;
  }

  if (!customer) {
    return (
      <div style={panelStyle}>
        <div style={headlineStyle}>Approved customers can view pricing</div>

        <div style={descriptionStyle}>
          This product is available for approved B2B customers. Log in to view
          your account pricing and create an order. If you do not yet have an
          account, you can submit an application for review.
        </div>

        <div style={actionGridStyle}>
          <a href="/portal-login" style={primaryLinkStyle}>
            Customer Login
          </a>
          <a href="/apply-for-account" style={secondaryLinkStyle}>
            Apply for Account
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 34,
            lineHeight: 1,
            fontWeight: 800,
          }}
        >
          {unitPrice > 0 ? formatMoney(unitPrice, customer.currency) : "Contact Sales"}
        </div>

        {hasDiscount ? (
          <>
            <div
              style={{
                fontSize: 20,
                color: "#877d6f",
                textDecoration: "line-through",
                fontWeight: 700,
              }}
            >
              {formatMoney(compareAtPrice, customer.currency)}
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 10px",
                borderRadius: 999,
                background: "#eef8f0",
                color: "#2f7d62",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Save {discountPercent}%
            </div>
          </>
        ) : null}
      </div>

      {option1.optionName ? (
        <VariantSelectBlock
          label={option1.optionName}
          values={option1.values}
          value={selectedOption1}
          onChange={setSelectedOption1}
        />
      ) : null}

      {option2.optionName ? (
        <VariantSelectBlock
          label={option2.optionName}
          values={availableOption2Values}
          value={selectedOption2}
          onChange={setSelectedOption2}
        />
      ) : null}

      {option3.optionName ? (
        <VariantSelectBlock
          label={option3.optionName}
          values={availableOption3Values}
          value={selectedOption3}
          onChange={setSelectedOption3}
        />
      ) : null}

      <div style={{ marginTop: 18 }}>
        <div style={metaLabelStyle}>Quantity</div>

        <div style={qtyWrapStyle}>
          <button type="button" onClick={decreaseQty} style={qtyButtonStyle}>
            −
          </button>

          <input
            type="number"
            min={minOrderQuantity}
            step={quantityStep}
            value={quantity}
            onChange={(e) => handleManualQty(e.target.value)}
            style={qtyInputStyle}
          />

          <button type="button" onClick={increaseQty} style={qtyButtonStyle}>
            +
          </button>
        </div>

        <div style={smallTextStyle}>
          Min order: {minOrderQuantity} • Step: {quantityStep}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          marginTop: 24,
        }}
      >
        <button
          type="button"
          onClick={handleAddToDraft}
          disabled={!available}
          style={primaryButtonStyle}
        >
          {available ? "Add to Draft Order" : "Unavailable"}
        </button>

        <a href="/account" style={secondaryLinkStyle}>
          View Draft Order
        </a>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gap: 10,
        }}
      >
        <InfoRow
          label="Variant"
          value={buildVariantLabel(selectedVariant || ({} as VariantItem))}
        />
        <InfoRow label="SKU" value={String(selectedVariant?.sku || "-")} />
        <InfoRow
          label="Box Quantity"
          value={String(selectedVariant?.box_quantity || "-")}
        />
        <InfoRow
          label="Availability"
          value={available ? "Available" : "Unavailable"}
        />
      </div>

      {feedbackMessage ? (
        <div style={feedbackBoxStyle}>{feedbackMessage}</div>
      ) : null}
    </div>
  );
}

function VariantSelectBlock({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (!values.length) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={metaLabelStyle}>{label}</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {values.map((item) => {
          const active = item === value;

          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              style={{
                minHeight: 42,
                padding: "0 16px",
                borderRadius: 999,
                border: active ? "1px solid #2f7d62" : "1px solid #ddd3c5",
                background: active ? "#eef8f0" : "#fff",
                color: "#171717",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        paddingBottom: 10,
        borderBottom: "1px solid #eee5d9",
      }}
    >
      <span style={{ color: "#7b7367", fontWeight: 700 }}>{label}</span>
      <span style={{ fontWeight: 800, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 28,
  border: "1px solid #e5ddd2",
  background: "#fff",
};

const headlineStyle: React.CSSProperties = {
  fontSize: 28,
  lineHeight: 1.2,
  fontWeight: 800,
  marginBottom: 12,
};

const descriptionStyle: React.CSSProperties = {
  color: "#6f6559",
  lineHeight: 1.75,
  marginBottom: 18,
};

const metaLabelStyle: React.CSSProperties = {
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7b7367",
  fontWeight: 700,
  marginBottom: 10,
};

const actionGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const qtyWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const qtyButtonStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 999,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  fontSize: 20,
  cursor: "pointer",
};

const qtyInputStyle: React.CSSProperties = {
  width: 110,
  minHeight: 44,
  borderRadius: 999,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  fontWeight: 700,
  fontSize: 15,
  textAlign: "center",
};

const smallTextStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#7b7367",
  fontSize: 13,
  lineHeight: 1.6,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 15,
  textDecoration: "none",
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 15,
  textDecoration: "none",
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  borderRadius: 999,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 15,
  textDecoration: "none",
};

const feedbackBoxStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 16,
  background: "#f8f5ef",
  border: "1px solid #e5ddd2",
  color: "#171717",
  fontWeight: 700,
};