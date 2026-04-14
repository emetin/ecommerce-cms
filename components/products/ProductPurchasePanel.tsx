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

function resolveListPrice(variant: VariantItem | null) {
  if (!variant) return 0;

  return (
    parsePrice(variant.compare_at_price) ||
    parsePrice(variant.price_standard) ||
    parsePrice(variant.price) ||
    0
  );
}

function isVariantAvailable(variant: VariantItem | null) {
  if (!variant) return false;

  const availability = normalizeLower(variant.is_available);

  if (!availability) return true;

  return ["true", "yes", "available", "active", "in-stock"].includes(
    availability
  );
}

function resolveAvailabilityLabel(available: boolean) {
  return available ? "Available for order" : "Currently unavailable";
}

function resolvePriceTierLabel(priceTier?: string) {
  const tier = normalizeLower(priceTier || "standard");

  if (tier === "vip") return "VIP Pricing";
  if (tier === "distributor") return "Distributor Pricing";
  if (tier === "wholesale") return "Wholesale Pricing";

  return "Standard Account Pricing";
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
  const listPrice = resolveListPrice(selectedVariant);
  const hasDiscount = listPrice > unitPrice && unitPrice > 0;
  const discountPercent = hasDiscount
    ? Math.round(((listPrice - unitPrice) / listPrice) * 100)
    : 0;

  const available = isVariantAvailable(selectedVariant);
  const lineTotal = unitPrice * quantity;
  const tierLabel = resolvePriceTierLabel(customer?.priceTier);

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
        <div style={eyebrowStyle}>B2B Access</div>
        <div style={headlineStyle}>Wholesale access required</div>
        <div style={descriptionStyle}>
          This product is available through our approved B2B customer portal.
          Apply for an account to start a purchasing relationship or contact our
          team for project-based support.
        </div>

        <div style={infoNoticeStyle}>
          Account approval gives your company access to structured product review,
          account-based pricing, and draft order submission.
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
    return (
      <div style={panelStyle}>
        <div style={eyebrowStyle}>Pricing Access</div>
        <div style={headlineStyle}>Loading customer pricing...</div>
        <div style={descriptionStyle}>
          We are preparing your account-based pricing and order access.
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={panelStyle}>
        <div style={eyebrowStyle}>Account-Based Pricing</div>
        <div style={headlineStyle}>Approved customers can view pricing</div>

        <div style={descriptionStyle}>
          This product is available for approved B2B customers. Log in to view
          your account pricing, minimum order terms, and draft order access. If
          your company is not yet approved, you can submit an application for review.
        </div>

        <div style={guestFeatureGridStyle}>
          <div style={guestFeatureCardStyle}>
            <div style={guestFeatureTitleStyle}>Tier Pricing</div>
            <div style={guestFeatureTextStyle}>
              Access account-based pricing after approval.
            </div>
          </div>

          <div style={guestFeatureCardStyle}>
            <div style={guestFeatureTitleStyle}>Draft Orders</div>
            <div style={guestFeatureTextStyle}>
              Build and review order requests before submission.
            </div>
          </div>

          <div style={guestFeatureCardStyle}>
            <div style={guestFeatureTitleStyle}>B2B Workflow</div>
            <div style={guestFeatureTextStyle}>
              Suitable for hospitality, project, and wholesale purchasing.
            </div>
          </div>
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
      <div style={topMetaWrapStyle}>
        <div>
          <div style={eyebrowStyle}>{tierLabel}</div>
          <div style={headlineStyleSmall}>
            Purchasing for {customer.companyName || "your account"}
          </div>
        </div>

        <div
          style={{
            ...availabilityBadgeStyle,
            background: available ? "#eef8f0" : "#fff3f2",
            color: available ? "#2f7d62" : "#a54a3f",
            borderColor: available ? "rgba(47,125,98,0.18)" : "rgba(165,74,63,0.18)",
          }}
        >
          {resolveAvailabilityLabel(available)}
        </div>
      </div>

      <div style={priceWrapStyle}>
        <div style={priceMainStyle}>
          {unitPrice > 0 ? formatMoney(unitPrice, customer.currency) : "Contact Sales"}
        </div>

        {hasDiscount ? (
          <>
            <div style={priceCompareStyle}>
              {formatMoney(listPrice, customer.currency)}
            </div>

            <div style={discountBadgeStyle}>Save {discountPercent}%</div>
          </>
        ) : null}
      </div>

      <div style={subLabelStyle}>Per unit, based on your approved account tier.</div>

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

      <div style={termsGridStyle}>
        <InfoStat label="Minimum Order" value={String(minOrderQuantity)} />
        <InfoStat label="Order Step" value={String(quantityStep)} />
        <InfoStat
          label="Box Quantity"
          value={String(selectedVariant?.box_quantity || "-")}
        />
      </div>

      <div style={{ marginTop: 20 }}>
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
          Orders begin at {minOrderQuantity} and increase in steps of {quantityStep}.
        </div>
      </div>

      <div style={summaryCardStyle}>
        <div style={summaryRowStyle}>
          <span>Selected Variant</span>
          <strong>{buildVariantLabel(selectedVariant || ({} as VariantItem))}</strong>
        </div>

        <div style={summaryRowStyle}>
          <span>SKU</span>
          <strong>{String(selectedVariant?.sku || "-")}</strong>
        </div>

        <div style={summaryRowStyle}>
          <span>Quantity</span>
          <strong>{quantity}</strong>
        </div>

        <div style={summaryRowStyle}>
          <span>Estimated Line Total</span>
          <strong>
            {unitPrice > 0 ? formatMoney(lineTotal, customer.currency) : "Contact Sales"}
          </strong>
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
          style={{
            ...primaryButtonStyle,
            opacity: available ? 1 : 0.65,
            cursor: available ? "pointer" : "not-allowed",
          }}
        >
          {available ? "Add to Draft Order" : "Unavailable"}
        </button>

        <a href="/account" style={secondaryLinkStyle}>
          View Draft Order
        </a>
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
    <div style={{ marginTop: 16 }}>
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

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoStatCardStyle}>
      <div style={infoStatLabelStyle}>{label}</div>
      <div style={infoStatValueStyle}>{value}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 28,
  border: "1px solid #e5ddd2",
  background: "#fff",
  boxShadow: "0 12px 32px rgba(23,23,23,0.04)",
};

const topMetaWrapStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 14,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7b7367",
  fontWeight: 800,
  marginBottom: 8,
};

const headlineStyle: React.CSSProperties = {
  fontSize: 28,
  lineHeight: 1.2,
  fontWeight: 800,
  marginBottom: 12,
  color: "#171717",
};

const headlineStyleSmall: React.CSSProperties = {
  fontSize: 24,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#171717",
};

const descriptionStyle: React.CSSProperties = {
  color: "#6f6559",
  lineHeight: 1.8,
  marginBottom: 18,
  fontSize: 15,
};

const infoNoticeStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 16,
  background: "#f8f5ef",
  border: "1px solid #e5ddd2",
  color: "#5f564c",
  lineHeight: 1.75,
  marginBottom: 18,
  fontSize: 14,
};

const guestFeatureGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  marginBottom: 18,
};

const guestFeatureCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid #ebe2d5",
  background: "#fcfbf8",
  padding: 14,
};

const guestFeatureTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#171717",
  marginBottom: 6,
  fontSize: 14,
};

const guestFeatureTextStyle: React.CSSProperties = {
  color: "#6f6559",
  lineHeight: 1.65,
  fontSize: 13,
};

const availabilityBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid transparent",
  fontSize: 13,
  fontWeight: 800,
};

const priceWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 8,
};

const priceMainStyle: React.CSSProperties = {
  fontSize: 38,
  lineHeight: 1,
  fontWeight: 800,
  color: "#171717",
};

const priceCompareStyle: React.CSSProperties = {
  fontSize: 20,
  color: "#877d6f",
  textDecoration: "line-through",
  fontWeight: 700,
};

const discountBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#eef8f0",
  color: "#2f7d62",
  fontWeight: 800,
  fontSize: 13,
};

const subLabelStyle: React.CSSProperties = {
  color: "#7b7367",
  fontSize: 13,
  lineHeight: 1.7,
  marginBottom: 12,
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

const termsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  marginTop: 18,
};

const infoStatCardStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 18,
  border: "1px solid #ebe2d5",
  background: "#fcfbf8",
};

const infoStatLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7b7367",
  fontWeight: 700,
  marginBottom: 6,
};

const infoStatValueStyle: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#171717",
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

const summaryCardStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 20,
  border: "1px solid #ebe2d5",
  background: "#faf8f4",
  display: "grid",
  gap: 10,
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  color: "#171717",
  fontSize: 14,
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