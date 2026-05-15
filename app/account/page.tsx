import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../lib/customer-auth";
import {
  findCustomerById,
  sanitizeCustomer,
} from "../../lib/customer-account";
import { getOrdersForCustomer } from "../../lib/account-orders";
import ReorderButton from "../../components/account/ReorderButton";

function formatMoney(value: string | number, currency: string) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return `${value} ${currency || "USD"}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || "USD"}`;
  }
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.split("T")[0] || value;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusStyle(status: string): React.CSSProperties {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "paid" || normalized === "completed") {
    return {
      background: "#ecfdf3",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (normalized === "cancelled") {
    return {
      background: "#fef2f2",
      color: "#b91c1c",
      border: "1px solid #fecaca",
    };
  }

  if (
    normalized === "processing" ||
    normalized === "approved" ||
    normalized === "quoted"
  ) {
    return {
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
  }

  return {
    background: "#fff8e8",
    color: "#8a5a00",
    border: "1px solid #f5deb0",
  };
}

function getStatusLabel(status: string) {
  const normalized = String(status || "submitted").toLowerCase();

  const labels: Record<string, string> = {
    submitted: "Submitted",
    reviewing: "Under Review",
    quoted: "Quoted",
    approved: "Approved",
    processing: "Processing",
    completed: "Completed",
    cancelled: "Cancelled",
    paid: "Paid",
  };

  return labels[normalized] || normalized;
}

function getSafeTotal(order: {
  grand_total?: string | number;
  subtotal?: string | number;
}) {
  const grandTotal = Number(order.grand_total || 0);
  const subtotal = Number(order.subtotal || 0);

  if (Number.isFinite(grandTotal) && grandTotal > 0) {
    return grandTotal;
  }

  return Number.isFinite(subtotal) ? subtotal : 0;
}

function getSafeItemCount(order: {
  item_count?: string | number;
}) {
  const itemCount = Number(order.item_count || 0);
  return Number.isFinite(itemCount) ? itemCount : 0;
}

export default async function AccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value || null;

  const session = await readCustomerFromSessionToken(token);

  if (!session?.customerId) {
    redirect("/portal-login");
  }

  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  const customer = await findCustomerById(session.customerUserId || session.customerId);

  if (!customer) {
    redirect("/portal-login");
  }

  const orders = await getOrdersForCustomer({
    customerId: customer.id,
    customerUserId: session.customerUserId || customer.customer_user_id,
    companyId: session.companyId || customer.company_id,
    email: customer.email,
  });

  const safeCustomer = sanitizeCustomer(customer);

  const fullName = [safeCustomer.first_name, safeCustomer.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <main style={mainStyle}>
      <div style={pageWrapStyle}>
        <section style={heroCardStyle}>
          <div>
            <div style={eyebrowStyle}>Member Portal</div>

            <h1 style={heroTitleStyle}>{fullName || safeCustomer.email}</h1>

            <p style={customerMetaStyle}>
              {safeCustomer.company || "No company information"}
            </p>

            <p style={customerMetaStyle}>{safeCustomer.email}</p>
          </div>

          <div style={heroActionsStyle}>
            <a href="/account/profile" style={secondaryButtonStyle}>
              Edit Profile
            </a>

            <a href="/collections" style={secondaryButtonStyle}>
              Browse Products
            </a>

            <form
              action="/api/customer-auth/logout"
              method="post"
              style={{ margin: 0 }}
            >
              <button type="submit" style={darkButtonStyle}>
                Sign Out
              </button>
            </form>
          </div>
        </section>

        <section style={quickStatsGridStyle}>
          <div style={quickStatCardStyle}>
            <div style={quickStatLabelStyle}>Company</div>
            <div style={quickStatValueStyle}>
              {safeCustomer.company || "-"}
            </div>
          </div>

          <div style={quickStatCardStyle}>
            <div style={quickStatLabelStyle}>Account Status</div>
            <div style={quickStatValueStyle}>
              {safeCustomer.status || "-"}
            </div>
          </div>

          <div style={quickStatCardStyle}>
            <div style={quickStatLabelStyle}>Currency</div>
            <div style={quickStatValueStyle}>
              {safeCustomer.currency || "USD"}
            </div>
          </div>

          <div style={quickStatCardStyle}>
            <div style={quickStatLabelStyle}>Quote Requests</div>
            <div style={quickStatValueStyle}>{orders.length}</div>
          </div>
        </section>

        <div style={layoutStyle}>
          <aside style={sideCardStyle}>
            <h2 style={sideTitleStyle}>Account Details</h2>

            <div style={{ display: "grid", gap: 18 }}>
              <InfoRow label="Name" value={fullName || "-"} />
              <InfoRow label="Company" value={safeCustomer.company || "-"} />
              <InfoRow label="Email" value={safeCustomer.email || "-"} />
              <InfoRow label="Phone" value={safeCustomer.phone || "-"} />
              <InfoRow label="Country" value={safeCustomer.country || "-"} />
              <InfoRow label="State" value={safeCustomer.state || "-"} />
              <InfoRow label="City" value={safeCustomer.city || "-"} />
              <InfoRow
                label="Address"
                value={safeCustomer.address_line_1 || "-"}
              />
              <InfoRow
                label="Address 2"
                value={safeCustomer.address_line_2 || "-"}
              />
              <InfoRow
                label="Postal Code"
                value={safeCustomer.postal_code || "-"}
              />
              <InfoRow
                label="Payment Terms"
                value={safeCustomer.payment_terms || "-"}
              />
              <InfoRow
                label="Customer Type"
                value={safeCustomer.customer_type || "-"}
              />
              <InfoRow label="Status" value={safeCustomer.status || "-"} />
              <InfoRow
                label="Last Login"
                value={formatDate(safeCustomer.last_login_at || "")}
              />
            </div>
          </aside>

          <section style={contentCardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Previous Quote Requests</h2>

                <p style={sectionSubtitleStyle}>
                  Access your submitted quote requests and quickly start a new
                  request from the same selections.
                </p>
              </div>

              <div style={countBadgeStyle}>{orders.length} Requests</div>
            </div>

            {orders.length === 0 ? (
              <div style={emptyStateStyle}>
                <h3 style={emptyTitleStyle}>No quote requests yet</h3>
                <p style={emptyTextStyle}>
                  Your submitted quote requests will appear here once you send
                  your first request.
                </p>

                <a href="/collections" style={darkInlineButtonStyle}>
                  Start New Quote Request
                </a>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {orders.map((order) => {
                  const itemCount = getSafeItemCount(order);
                  const estimatedTotal = getSafeTotal(order);
                  const currency = String(order.currency || "USD");

                  return (
                    <div key={order.id} style={requestRowStyle}>
                      <div style={{ minWidth: 0 }}>
                        <div style={requestNumberStyle}>
                          {order.order_number || "Quote Request"}
                        </div>

                        <div style={requestMetaStyle}>
                          {itemCount} item{itemCount === 1 ? "" : "s"}
                        </div>
                      </div>

                      <div style={dateTextStyle}>
                        {formatDate(String(order.created_at || ""))}
                      </div>

                      <div style={totalTextStyle}>
                        {formatMoney(estimatedTotal, currency)}
                      </div>

                      <div>
                        <span
                          style={{
                            ...statusPillStyle,
                            ...getStatusStyle(String(order.status || "")),
                          }}
                        >
                          {getStatusLabel(String(order.status || "submitted"))}
                        </span>
                      </div>

                      <div style={rowActionsStyle}>
                        <a
                          href={`/account/orders/${encodeURIComponent(
                            String(order.order_number || "")
                          )}`}
                          style={ghostActionStyle}
                        >
                          View
                        </a>

                        <ReorderButton
                          orderNumber={String(order.order_number || "")}
                          label="Reorder"
                          variant="dark"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={infoLabelStyle}>{label}</div>
      <div style={infoValueStyle}>{value}</div>
    </div>
  );
}

const mainStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f7f4ee",
  padding: "40px 20px 70px",
};

const pageWrapStyle: React.CSSProperties = {
  maxWidth: 1220,
  margin: "0 auto",
  display: "grid",
  gap: 24,
};

const heroCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e6ddd0",
  borderRadius: 28,
  padding: 28,
  boxShadow: "0 10px 30px rgba(23,23,23,0.05)",
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 10,
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 36,
  lineHeight: 1.1,
  color: "#171717",
  fontFamily: "var(--font-heading)",
};

const customerMetaStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#665d52",
  fontSize: 15,
};

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  justifyContent: "flex-end",
  alignItems: "center",
};

const secondaryButtonStyle: React.CSSProperties = {
  height: 50,
  padding: "0 22px",
  borderRadius: 999,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  lineHeight: 1,
  flex: "0 0 auto",
};

const darkButtonStyle: React.CSSProperties = {
  height: 50,
  padding: "0 22px",
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
  lineHeight: 1,
};

const darkInlineButtonStyle: React.CSSProperties = {
  minHeight: 46,
  padding: "0 20px",
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
};

const quickStatsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
};

const quickStatCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e6ddd0",
  borderRadius: 22,
  padding: 20,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const quickStatLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 8,
};

const quickStatValueStyle: React.CSSProperties = {
  fontSize: 20,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#171717",
};

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: 24,
  alignItems: "start",
};

const sideCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e6ddd0",
  borderRadius: 28,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.05)",
  alignSelf: "start",
};

const sideTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 18,
  color: "#171717",
  fontFamily: "var(--font-heading)",
  fontSize: 24,
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 4,
};

const infoValueStyle: React.CSSProperties = {
  color: "#171717",
  fontWeight: 700,
  wordBreak: "break-word",
};

const contentCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e6ddd0",
  borderRadius: 28,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.05)",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#171717",
  fontFamily: "var(--font-heading)",
  fontSize: 24,
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#665d52",
};

const countBadgeStyle: React.CSSProperties = {
  minWidth: 120,
  textAlign: "center",
  padding: "10px 14px",
  borderRadius: 999,
  background: "#f4efe7",
  color: "#171717",
  fontWeight: 800,
};

const emptyStateStyle: React.CSSProperties = {
  border: "1px dashed #d9cfbf",
  borderRadius: 20,
  padding: 28,
  color: "#665d52",
  display: "grid",
  gap: 12,
};

const emptyTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 20,
  fontFamily: "var(--font-heading)",
};

const emptyTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#665d52",
  lineHeight: 1.6,
};

const requestRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.45fr) 0.95fr 0.95fr 0.9fr auto",
  alignItems: "center",
  gap: 12,
  padding: "16px 18px",
  borderRadius: 18,
  border: "1px solid #eadfce",
  background: "#fff",
};

const requestNumberStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#171717",
  fontSize: 16,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  marginBottom: 4,
};

const requestMetaStyle: React.CSSProperties = {
  color: "#7a7166",
  fontSize: 13,
};

const dateTextStyle: React.CSSProperties = {
  color: "#665d52",
  fontSize: 14,
  whiteSpace: "nowrap",
};

const totalTextStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#171717",
  fontSize: 14,
  whiteSpace: "nowrap",
};

const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "capitalize",
  whiteSpace: "nowrap",
};

const rowActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
  flexWrap: "wrap",
  alignItems: "center",
};

const ghostActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 13,
  whiteSpace: "nowrap",
};