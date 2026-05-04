"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";

type DraftOrder = {
  id: string;
  draft_number: string;
  customer_id: string;
  email: string;
  company: string;
  contact_name: string;
  status: string;
  currency: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  item_count: string;
  note: string;
  created_by: string;
  converted_order_id: string;
  created_at: string;
  updated_at: string;
};

type CustomerOption = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  customer_code: string;
  price_tier: string;
  currency: string;
  status: string;
};

type ProductOption = {
  product_slug: string;
  product_title: string;
  variant_id: string;
  variant_title: string;
  sku: string;
  image: string;
  unit_price: string;
  collection_slug: string;
};

type DraftOrderItemInput = {
  product_slug: string;
  variant_id: string;
  sku: string;
  product_title: string;
  variant_title: string;
  image: string;
  quantity: string;
  unit_price: string;
};

type DraftOrdersResponse = {
  ok: boolean;
  error?: string;
  items?: DraftOrder[];
};

type CustomerSearchResponse = {
  ok: boolean;
  error?: string;
  items?: CustomerOption[];
};

type ProductSearchResponse = {
  ok: boolean;
  error?: string;
  items?: ProductOption[];
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  draft?: DraftOrder;
  order?: {
    id?: string;
    order_number?: string;
  };
};

const STATUS_OPTIONS = ["draft", "sent", "approved", "converted", "cancelled"];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toNumber(value: unknown) {
  const cleaned = String(value || "0").replace(/[^0-9.-]/g, "");
  const next = Number(cleaned);

  return Number.isFinite(next) ? next : 0;
}

function money(value: unknown, currency = "USD") {
  return toNumber(value).toLocaleString("en-US", {
    style: "currency",
    currency: currency || "USD",
  });
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusStyle(status: string): CSSProperties {
  const normalized = normalizeLower(status);

  if (normalized === "converted" || normalized === "approved") {
    return {
      background: "#eef8f0",
      color: "#2f7d62",
      border: "1px solid rgba(47,125,98,0.18)",
    };
  }

  if (normalized === "sent") {
    return {
      background: "#eef4ff",
      color: "#355f9f",
      border: "1px solid rgba(53,95,159,0.18)",
    };
  }

  if (normalized === "cancelled") {
    return {
      background: "#fff4f2",
      color: "#a54a3f",
      border: "1px solid rgba(165,74,63,0.18)",
    };
  }

  return {
    background: "#fff7e8",
    color: "#8a6418",
    border: "1px solid rgba(138,100,24,0.18)",
  };
}

function createItemFromProduct(product: ProductOption): DraftOrderItemInput {
  return {
    product_slug: product.product_slug,
    variant_id: product.variant_id,
    sku: product.sku,
    product_title: product.product_title,
    variant_title: product.variant_title,
    image: product.image,
    quantity: "1",
    unit_price: product.unit_price || "0",
  };
}

export default function AdminDraftOrdersPage() {
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerOption | null>(null);

  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [productSearching, setProductSearching] = useState(false);

  const [editingStatusId, setEditingStatusId] = useState("");
  const [statusValue, setStatusValue] = useState("draft");

  const [convertDraft, setConvertDraft] = useState<DraftOrder | null>(null);

  const [form, setForm] = useState({
    customer_id: "",
    email: "",
    company: "",
    contact_name: "",
    status: "draft",
    currency: "USD",
    discount_type: "amount",
    discount_value: "0",
    shipping_total: "0",
    tax_total: "0",
    note: "",
  });

  const [items, setItems] = useState<DraftOrderItemInput[]>([]);

  async function loadDraftOrders() {
    const response = await fetch("/api/admin/draft-orders", {
      cache: "no-store",
    });

    const data = (await response.json()) as DraftOrdersResponse;

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to load draft orders.");
    }

    setDrafts(Array.isArray(data.items) ? data.items : []);
  }

  async function loadPageData() {
    try {
      setLoading(true);
      setErrorMessage("");
      await loadDraftOrders();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown loading error."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  async function searchCustomers(queryValue = customerQuery) {
    try {
      setCustomerSearching(true);
      setErrorMessage("");

      const response = await fetch(
        `/api/admin/draft-orders/customer-search?q=${encodeURIComponent(
          queryValue
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = (await response.json()) as CustomerSearchResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to search customers.");
      }

      setCustomerResults(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown customer search error."
      );
    } finally {
      setCustomerSearching(false);
    }
  }

  async function searchProducts(queryValue = productQuery) {
    try {
      setProductSearching(true);
      setErrorMessage("");

      const response = await fetch(
        `/api/admin/draft-orders/product-search?q=${encodeURIComponent(
          queryValue
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = (await response.json()) as ProductSearchResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to search products.");
      }

      setProductResults(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown product search error."
      );
    } finally {
      setProductSearching(false);
    }
  }

  function selectCustomer(customer: CustomerOption) {
    setSelectedCustomer(customer);
    setCustomerQuery(
      customer.company_name || customer.email || customer.customer_code || ""
    );
    setCustomerResults([]);

    setForm((previous) => ({
      ...previous,
      customer_id: customer.id,
      email: customer.email,
      company: customer.company_name,
      contact_name: customer.contact_name,
      currency: customer.currency || previous.currency || "USD",
    }));
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerResults([]);

    setForm((previous) => ({
      ...previous,
      customer_id: "",
      email: "",
      company: "",
      contact_name: "",
    }));
  }

  function addProductToDraft(product: ProductOption) {
    setItems((previous) => {
      const existingIndex = previous.findIndex((item) => {
        return (
          item.product_slug === product.product_slug &&
          item.variant_id === product.variant_id &&
          item.sku === product.sku
        );
      });

      if (existingIndex >= 0) {
        return previous.map((item, index) => {
          if (index !== existingIndex) return item;

          return {
            ...item,
            quantity: String(toNumber(item.quantity) + 1),
          };
        });
      }

      return [...previous, createItemFromProduct(product)];
    });

    setProductQuery("");
    setProductResults([]);
  }

  const filteredDrafts = useMemo(() => {
    const query = normalizeLower(searchInput);

    return drafts.filter((draft) => {
      const matchesSearch =
        !query ||
        normalizeLower(draft.draft_number).includes(query) ||
        normalizeLower(draft.company).includes(query) ||
        normalizeLower(draft.email).includes(query) ||
        normalizeLower(draft.contact_name).includes(query) ||
        normalizeLower(draft.status).includes(query);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : normalizeLower(draft.status) === normalizeLower(statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [drafts, searchInput, statusFilter]);

  const formTotals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      return sum + toNumber(item.quantity) * toNumber(item.unit_price);
    }, 0);

    const discountValue = toNumber(form.discount_value);

    const discountTotal =
      form.discount_type === "percentage"
        ? subtotal * (discountValue / 100)
        : discountValue;

    const safeDiscountTotal = Math.min(Math.max(discountTotal, 0), subtotal);
    const shippingTotal = toNumber(form.shipping_total);
    const taxTotal = toNumber(form.tax_total);
    const grandTotal = subtotal - safeDiscountTotal + shippingTotal + taxTotal;

    const itemCount = items.reduce((sum, item) => {
      return sum + toNumber(item.quantity);
    }, 0);

    return {
      subtotal,
      discountTotal: safeDiscountTotal,
      shippingTotal,
      taxTotal,
      grandTotal,
      itemCount,
    };
  }, [
    items,
    form.discount_type,
    form.discount_value,
    form.shipping_total,
    form.tax_total,
  ]);

  const stats = useMemo(() => {
    return {
      total: drafts.length,
      draft: drafts.filter((item) => normalizeLower(item.status) === "draft")
        .length,
      sent: drafts.filter((item) => normalizeLower(item.status) === "sent")
        .length,
      converted: drafts.filter(
        (item) => normalizeLower(item.status) === "converted"
      ).length,
    };
  }, [drafts]);

  function updateItem(
    index: number,
    field: keyof DraftOrderItemInput,
    value: string
  ) {
    setItems((previous) => {
      return previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        return {
          ...item,
          [field]: value,
        };
      });
    });
  }

  function removeItemRow(index: number) {
    setItems((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function resetCreateForm() {
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerResults([]);
    setProductQuery("");
    setProductResults([]);

    setForm({
      customer_id: "",
      email: "",
      company: "",
      contact_name: "",
      status: "draft",
      currency: "USD",
      discount_type: "amount",
      discount_value: "0",
      shipping_total: "0",
      tax_total: "0",
      note: "",
    });

    setItems([]);
  }

  async function handleCreateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!form.email && !form.company) {
        throw new Error("Please select a customer or enter customer details.");
      }

      if (!items.length) {
        throw new Error("Please add at least one product.");
      }

      const validItems = items.filter((item) => {
        return (
          normalizeText(item.product_title) ||
          normalizeText(item.sku) ||
          normalizeText(item.product_slug)
        );
      });

      if (!validItems.length) {
        throw new Error("At least one valid item is required.");
      }

      const response = await fetch("/api/admin/draft-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: form.customer_id,
          email: form.email,
          company: form.company,
          contact_name: form.contact_name,
          status: form.status,
          currency: form.currency,
          discount_total: String(formTotals.discountTotal),
          shipping_total: form.shipping_total,
          tax_total: form.tax_total,
          note: form.note,
          items: validItems,
        }),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to create draft order.");
      }

      setSuccessMessage("Draft order created successfully.");
      resetCreateForm();
      await loadDraftOrders();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown create error."
      );
    } finally {
      setSaving(false);
    }
  }

  function openStatusEdit(draft: DraftOrder) {
    setEditingStatusId(draft.id);
    setStatusValue(draft.status || "draft");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeStatusEdit() {
    setEditingStatusId("");
  }

  async function handleStatusUpdate(draftId: string) {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/admin/draft-orders/${encodeURIComponent(draftId)}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: statusValue,
          }),
        }
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to update draft order status.");
      }

      setSuccessMessage("Draft order status updated successfully.");
      setEditingStatusId("");
      await loadDraftOrders();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown status update error."
      );
    } finally {
      setSaving(false);
    }
  }

  function openConvertModal(draft: DraftOrder) {
    setConvertDraft(draft);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeConvertModal() {
    setConvertDraft(null);
  }

  async function confirmConvertDraft() {
    if (!convertDraft) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/admin/draft-orders/${encodeURIComponent(convertDraft.id)}/convert`,
        {
          method: "POST",
        }
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to convert draft order.");
      }

      setSuccessMessage("Draft order converted to order successfully.");
      setConvertDraft(null);
      await loadDraftOrders();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown convert error."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={loadingCardStyle}>Loading draft orders...</div>;
  }

  return (
    <div style={pageStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Draft Orders</h1>
          <p style={subtitleStyle}>
            Create B2B draft orders by selecting a customer and adding products
            from your catalog.
          </p>
        </div>
      </div>

      {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}
      {successMessage ? (
        <div style={successBoxStyle}>{successMessage}</div>
      ) : null}

      <section style={statsGridStyle}>
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Draft" value={stats.draft} />
        <StatCard label="Sent" value={stats.sent} />
        <StatCard label="Converted" value={stats.converted} />
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <div style={eyebrowStyle}>Create</div>
            <h2 style={panelTitleStyle}>New Draft Order</h2>
          </div>

          <div style={totalBoxStyle}>
            <span>Grand Total</span>
            <strong>{money(formTotals.grandTotal, form.currency)}</strong>
          </div>
        </div>

        <form onSubmit={handleCreateDraft} style={formStyle}>
          <div style={sectionBoxStyle}>
            <div style={sectionHeaderInlineStyle}>
              <div>
                <div style={eyebrowStyle}>Customer</div>
                <h3 style={miniTitleStyle}>Select Customer</h3>
              </div>

              {selectedCustomer ? (
                <button
                  type="button"
                  onClick={clearCustomer}
                  style={secondaryButtonStyle}
                >
                  Change Customer
                </button>
              ) : null}
            </div>

            <div style={searchRowStyle}>
              <input
                value={customerQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomerQuery(value);

                  if (value.length >= 2) {
                    searchCustomers(value);
                  }

                  if (!value) {
                    setCustomerResults([]);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    searchCustomers();
                  }
                }}
                placeholder="Search by company, email, customer code..."
                style={inputStyle}
              />

              <button
                type="button"
                onClick={() => searchCustomers()}
                style={secondaryButtonStyle}
              >
                {customerSearching ? "Searching..." : "Search"}
              </button>
            </div>

            {customerResults.length ? (
              <div style={resultsListStyle}>
                {customerResults.map((customer) => (
                  <button
                    type="button"
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    style={resultButtonStyle}
                  >
                    <span>
                      <strong>{customer.company_name || customer.email}</strong>
                      <small>
                        {customer.contact_name || "-"} • {customer.email || "-"}{" "}
                        • {customer.customer_code || customer.id}
                      </small>
                    </span>

                    <span style={miniPillStyle}>{customer.price_tier}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {selectedCustomer ? (
              <div style={selectedCustomerStyle}>
                <Meta label="Customer ID" value={form.customer_id || "-"} />
                <Meta label="Company" value={form.company || "-"} />
                <Meta label="Contact" value={form.contact_name || "-"} />
                <Meta label="Email" value={form.email || "-"} />
                <Meta label="Currency" value={form.currency || "USD"} />
                <Meta
                  label="Price Tier"
                  value={selectedCustomer.price_tier || "standard"}
                />
              </div>
            ) : (
              <div style={manualCustomerGridStyle}>
                <Field label="Email">
                  <input
                    value={form.email}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                    placeholder="buyer@example.com"
                    type="email"
                    style={inputStyle}
                  />
                </Field>

                <Field label="Company">
                  <input
                    value={form.company}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        company: event.target.value,
                      }))
                    }
                    placeholder="Hotel or company"
                    style={inputStyle}
                  />
                </Field>

                <Field label="Contact">
                  <input
                    value={form.contact_name}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        contact_name: event.target.value,
                      }))
                    }
                    placeholder="Contact person"
                    style={inputStyle}
                  />
                </Field>
              </div>
            )}
          </div>

          <div style={formGridStyle}>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    status: event.target.value,
                  }))
                }
                style={inputStyle}
              >
                {STATUS_OPTIONS.filter((status) => status !== "converted").map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Currency">
              <input
                value={form.currency}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    currency: event.target.value,
                  }))
                }
                placeholder="USD"
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={sectionBoxStyle}>
            <div style={sectionHeaderInlineStyle}>
              <div>
                <div style={eyebrowStyle}>Products</div>
                <h3 style={miniTitleStyle}>Add Items</h3>
              </div>
            </div>

            <div style={searchRowStyle}>
              <input
                value={productQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setProductQuery(value);

                  if (value.length >= 2) {
                    searchProducts(value);
                  }

                  if (!value) {
                    setProductResults([]);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    searchProducts();
                  }
                }}
                placeholder="Search product, SKU, variant..."
                style={inputStyle}
              />

              <button
                type="button"
                onClick={() => searchProducts()}
                style={secondaryButtonStyle}
              >
                {productSearching ? "Searching..." : "Search"}
              </button>
            </div>

            {productResults.length ? (
              <div style={resultsListStyle}>
                {productResults.map((product) => (
                  <button
                    type="button"
                    key={`${product.product_slug}-${product.variant_id}-${product.sku}`}
                    onClick={() => addProductToDraft(product)}
                    style={resultButtonStyle}
                  >
                    <span>
                      <strong>{product.product_title}</strong>
                      <small>
                        {product.variant_title || "Default"} •{" "}
                        {product.sku || "No SKU"} • {product.product_slug}
                      </small>
                    </span>

                    <span style={miniPillStyle}>
                      {money(product.unit_price, form.currency)}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div style={itemRowsStyle}>
              {items.length === 0 ? (
                <div style={emptyStyle}>
                  Search and select products to add items to this draft order.
                </div>
              ) : (
                items.map((item, index) => {
                  const lineTotal =
                    toNumber(item.quantity) * toNumber(item.unit_price);

                  return (
                    <div
                      key={`${item.product_slug}-${item.variant_id}-${index}`}
                      style={itemRowStyle}
                    >
                      <div>
                        <div style={itemTitleStyle}>{item.product_title}</div>
                        <div style={itemSubTextStyle}>
                          {item.variant_title || "Default"} •{" "}
                          {item.sku || "No SKU"}
                        </div>
                      </div>

                      <Field label="Quantity">
                        <input
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(index, "quantity", event.target.value)
                          }
                          type="number"
                          min="0"
                          step="1"
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Unit Price">
                        <input
                          value={item.unit_price}
                          onChange={(event) =>
                            updateItem(index, "unit_price", event.target.value)
                          }
                          type="number"
                          min="0"
                          step="0.01"
                          style={inputStyle}
                        />
                      </Field>

                      <div style={lineTotalStyle}>
                        <span>Line Total</span>
                        <strong>{money(lineTotal, form.currency)}</strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        style={dangerGhostButtonStyle}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={totalsGridStyle}>
            <div style={discountGroupStyle}>
              <Field label="Discount Type">
                <select
                  value={form.discount_type}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      discount_type: event.target.value,
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="amount">Amount</option>
                  <option value="percentage">Percentage</option>
                </select>
              </Field>

              <Field
                label={
                  form.discount_type === "percentage"
                    ? "Discount %"
                    : "Discount Amount"
                }
              >
                <input
                  value={form.discount_value}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      discount_value: event.target.value,
                    }))
                  }
                  type="number"
                  min="0"
                  max={form.discount_type === "percentage" ? "100" : undefined}
                  step="0.01"
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field label="Shipping Total">
              <input
                value={form.shipping_total}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    shipping_total: event.target.value,
                  }))
                }
                type="number"
                min="0"
                step="0.01"
                style={inputStyle}
              />
            </Field>

            <Field label="Tax Total">
              <input
                value={form.tax_total}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    tax_total: event.target.value,
                  }))
                }
                type="number"
                min="0"
                step="0.01"
                style={inputStyle}
              />
            </Field>

            <div style={summaryMiniCardStyle}>
              <span>Discount</span>
              <strong>{money(formTotals.discountTotal, form.currency)}</strong>
            </div>

            <div style={summaryMiniCardStyle}>
              <span>Subtotal</span>
              <strong>{money(formTotals.subtotal, form.currency)}</strong>
            </div>

            <div style={summaryMiniCardDarkStyle}>
              <span>Total</span>
              <strong>{money(formTotals.grandTotal, form.currency)}</strong>
            </div>
          </div>

          <Field label="Note">
            <textarea
              value={form.note}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  note: event.target.value,
                }))
              }
              placeholder="Internal quote/order note"
              style={textareaStyle}
            />
          </Field>

          <div style={actionsStyle}>
            <button type="submit" disabled={saving} style={primaryButtonStyle}>
              {saving ? "Creating..." : "Create Draft Order"}
            </button>

            <button
              type="button"
              onClick={resetCreateForm}
              style={secondaryButtonStyle}
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section style={panelStyle}>
        <div style={listHeaderStyle}>
          <div>
            <div style={eyebrowStyle}>Manage</div>
            <h2 style={panelTitleStyle}>Draft Orders</h2>
          </div>
        </div>

        <div style={filterGridStyle}>
          <Field label="Search">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search draft number, company, email..."
              style={inputStyle}
            />
          </Field>

          <Field label="Status">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={inputStyle}
            >
              <option value="all">all</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={draftListStyle}>
          {filteredDrafts.length === 0 ? (
            <div style={emptyStyle}>No draft orders found.</div>
          ) : (
            filteredDrafts.map((draft) => {
              const isStatusOpen = editingStatusId === draft.id;
              const converted = normalizeLower(draft.status) === "converted";

              return (
                <div key={draft.id} style={draftCardStyle}>
                  <div style={draftTopStyle}>
                    <div>
                      <div style={draftNumberStyle}>
                        {draft.draft_number || "-"}
                      </div>
                      <div style={draftMetaTextStyle}>
                        {draft.company || "No company"} •{" "}
                        {draft.email || "No email"}
                      </div>
                    </div>

                    <div style={topActionsStyle}>
                      <span
                        style={{
                          ...statusPillStyle,
                          ...getStatusStyle(draft.status),
                        }}
                      >
                        {draft.status || "draft"}
                      </span>

                      <button
                        type="button"
                        onClick={() => openStatusEdit(draft)}
                        disabled={converted}
                        style={secondaryButtonStyle}
                      >
                        Status
                      </button>

                      <button
                        type="button"
                        onClick={() => openConvertModal(draft)}
                        disabled={converted || saving}
                        style={converted ? disabledButtonStyle : primaryButtonStyle}
                      >
                        Convert
                      </button>
                    </div>
                  </div>

                  <div style={metaGridStyle}>
                    <Meta label="Contact" value={draft.contact_name || "-"} />
                    <Meta label="Items" value={draft.item_count || "0"} />
                    <Meta
                      label="Subtotal"
                      value={money(draft.subtotal, draft.currency)}
                    />
                    <Meta
                      label="Grand Total"
                      value={money(draft.grand_total, draft.currency)}
                    />
                    <Meta label="Created By" value={draft.created_by || "-"} />
                    <Meta label="Created" value={formatDate(draft.created_at)} />
                    <Meta label="Updated" value={formatDate(draft.updated_at)} />
                    <Meta
                      label="Converted Order"
                      value={draft.converted_order_id || "-"}
                    />
                  </div>

                  {draft.note ? (
                    <div style={noteBoxStyle}>{draft.note}</div>
                  ) : null}

                  {isStatusOpen ? (
                    <div style={editStatusBoxStyle}>
                      <Field label="New Status">
                        <select
                          value={statusValue}
                          onChange={(event) => setStatusValue(event.target.value)}
                          style={inputStyle}
                        >
                          {STATUS_OPTIONS.filter(
                            (status) => status !== "converted"
                          ).map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <div style={actionsStyle}>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(draft.id)}
                          disabled={saving}
                          style={primaryButtonStyle}
                        >
                          {saving ? "Saving..." : "Save Status"}
                        </button>

                        <button
                          type="button"
                          onClick={closeStatusEdit}
                          style={secondaryButtonStyle}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      {convertDraft ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={eyebrowStyle}>Confirm Conversion</div>
                <h3 style={modalTitleStyle}>Convert Draft Order?</h3>
              </div>

              <button
                type="button"
                onClick={closeConvertModal}
                style={modalCloseButtonStyle}
              >
                ×
              </button>
            </div>

            <p style={modalTextStyle}>
              This will convert the draft order into a real order and create
              records in Orders and Order Items.
            </p>

            <div style={modalSummaryStyle}>
              <Meta
                label="Draft Number"
                value={convertDraft.draft_number || "-"}
              />
              <Meta label="Company" value={convertDraft.company || "-"} />
              <Meta
                label="Grand Total"
                value={money(convertDraft.grand_total, convertDraft.currency)}
              />
              <Meta label="Status" value={convertDraft.status || "draft"} />
            </div>

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={closeConvertModal}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmConvertDraft}
                disabled={saving}
                style={primaryButtonStyle}
              >
                {saving ? "Converting..." : "Convert to Order"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={statCardStyle}>
      <div style={statLabelStyle}>{label}</div>
      <div style={statValueStyle}>{value}</div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={metaLabelStyle}>{label}</div>
      <div style={metaValueStyle}>{value || "-"}</div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: 20,
};

const pageHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 34,
  lineHeight: 1.1,
  fontWeight: 800,
  color: "#171717",
};

const subtitleStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#6f6559",
  fontSize: 14,
  lineHeight: 1.6,
  maxWidth: 760,
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
};

const statCardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 16,
  padding: 16,
};

const statLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#756b60",
  fontWeight: 800,
  marginBottom: 7,
};

const statValueStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: "#171717",
};

const panelStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 18,
  padding: 18,
};

const panelHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
  flexWrap: "wrap",
};

const listHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#8a7f72",
  fontWeight: 900,
  marginBottom: 5,
};

const panelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 900,
  color: "#171717",
};

const miniTitleStyle: CSSProperties = {
  margin: 0,
  color: "#171717",
  fontWeight: 900,
  fontSize: 17,
};

const totalBoxStyle: CSSProperties = {
  minHeight: 52,
  borderRadius: 14,
  background: "#171717",
  color: "#fff",
  padding: "8px 14px",
  display: "grid",
  alignContent: "center",
  gap: 2,
  minWidth: 170,
};

const formStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const manualCustomerGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const sectionBoxStyle: CSSProperties = {
  border: "1px solid #eee5d9",
  borderRadius: 16,
  background: "#faf8f4",
  padding: 14,
  display: "grid",
  gap: 12,
};

const sectionHeaderInlineStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const searchRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
  alignItems: "center",
};

const resultsListStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const resultButtonStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #eee5d9",
  borderRadius: 12,
  background: "#fff",
  padding: 12,
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  textAlign: "left",
  color: "#171717",
};

const miniPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  borderRadius: 999,
  padding: "0 10px",
  background: "#fff7e8",
  border: "1px solid #ecd8ad",
  color: "#8a6418",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const selectedCustomerStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 10,
  border: "1px solid #e2d8cb",
  borderRadius: 14,
  background: "#fff",
  padding: 12,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
};

const labelStyle: CSSProperties = {
  color: "#171717",
  fontSize: 12,
  fontWeight: 900,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 42,
  border: "1px solid #d8cebf",
  borderRadius: 12,
  background: "#fcfbf8",
  color: "#171717",
  padding: "0 12px",
  outline: "none",
  fontSize: 13,
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 90,
  padding: 12,
  resize: "vertical",
};

const itemRowsStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const itemRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.6fr 0.55fr 0.7fr 0.75fr auto",
  gap: 10,
  alignItems: "end",
  border: "1px solid #eee5d9",
  background: "#fff",
  borderRadius: 14,
  padding: 12,
};

const itemTitleStyle: CSSProperties = {
  fontWeight: 900,
  color: "#171717",
  marginBottom: 4,
};

const itemSubTextStyle: CSSProperties = {
  color: "#756b60",
  fontSize: 12,
  fontWeight: 700,
};

const lineTotalStyle: CSSProperties = {
  minHeight: 42,
  border: "1px solid #e2d8cb",
  borderRadius: 12,
  background: "#fcfbf8",
  padding: "6px 10px",
  display: "grid",
  alignContent: "center",
  gap: 2,
  color: "#171717",
  fontSize: 12,
};

const totalsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr 1fr",
  gap: 12,
  alignItems: "end",
};

const discountGroupStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const summaryMiniCardStyle: CSSProperties = {
  minHeight: 42,
  border: "1px solid #e2d8cb",
  borderRadius: 12,
  background: "#fcfbf8",
  padding: "6px 10px",
  display: "grid",
  alignContent: "center",
  gap: 2,
  fontSize: 12,
};

const summaryMiniCardDarkStyle: CSSProperties = {
  ...summaryMiniCardStyle,
  background: "#171717",
  border: "1px solid #171717",
  color: "#fff",
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  padding: "0 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: 36,
  borderRadius: 10,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  padding: "0 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const dangerGhostButtonStyle: CSSProperties = {
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid #e5c8c3",
  background: "#fff4f2",
  color: "#a54a3f",
  padding: "0 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const disabledButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const topActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const filterGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 12,
  marginBottom: 14,
};

const draftListStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const draftCardStyle: CSSProperties = {
  border: "1px solid #eee5d9",
  borderRadius: 16,
  background: "#fcfbf8",
  padding: 14,
  display: "grid",
  gap: 12,
};

const draftTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const draftNumberStyle: CSSProperties = {
  color: "#171717",
  fontWeight: 900,
  fontSize: 18,
  marginBottom: 4,
};

const draftMetaTextStyle: CSSProperties = {
  color: "#756b60",
  fontSize: 12,
  fontWeight: 700,
};

const statusPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 30,
  padding: "0 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
};

const metaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 10,
};

const metaLabelStyle: CSSProperties = {
  color: "#756b60",
  fontSize: 11,
  fontWeight: 900,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const metaValueStyle: CSSProperties = {
  color: "#171717",
  fontWeight: 800,
  fontSize: 12,
  lineHeight: 1.5,
};

const noteBoxStyle: CSSProperties = {
  border: "1px solid #eee5d9",
  borderRadius: 12,
  background: "#fff",
  padding: 12,
  color: "#5f554b",
  fontSize: 13,
  lineHeight: 1.6,
};

const editStatusBoxStyle: CSSProperties = {
  borderTop: "1px solid #eee5d9",
  paddingTop: 14,
  display: "grid",
  gap: 12,
  maxWidth: 360,
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(23,23,23,0.42)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalCardStyle: CSSProperties = {
  width: "min(560px, 100%)",
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 20,
  padding: 22,
  boxShadow: "0 24px 80px rgba(23,23,23,0.22)",
  display: "grid",
  gap: 16,
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 900,
  color: "#171717",
};

const modalTextStyle: CSSProperties = {
  margin: 0,
  color: "#6f6559",
  fontSize: 14,
  lineHeight: 1.6,
};

const modalSummaryStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
  background: "#faf8f4",
  border: "1px solid #eee5d9",
  borderRadius: 14,
  padding: 14,
};

const modalActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const modalCloseButtonStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "1px solid #e2d8cb",
  background: "#fff",
  color: "#171717",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
};

const errorBoxStyle: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 800,
};

const successBoxStyle: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontWeight: 800,
};

const emptyStyle: CSSProperties = {
  padding: 16,
  color: "#756b60",
  fontWeight: 800,
};

const loadingCardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 16,
  padding: 18,
  color: "#756b60",
  fontWeight: 800,
};