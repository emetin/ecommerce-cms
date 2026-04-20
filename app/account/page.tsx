import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../lib/customer-auth";
import {
  findCustomerById,
  getOrdersForCustomer,
  sanitizeCustomer,
} from "../../lib/customer-account";

function formatMoney(value: string, currency: string) {
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

  if (normalized === "processing" || normalized === "shipped") {
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

  const customer = await findCustomerById(session.customerId);

  if (!customer) {
    redirect("/portal-login");
  }

  const orders = await getOrdersForCustomer({
    customerId: customer.id,
    email: customer.email,
  });

  const safeCustomer = sanitizeCustomer(customer);
  const fullName = [safeCustomer.first_name, safeCustomer.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f4ee",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 1220,
          margin: "0 auto",
          display: "grid",
          gap: 24,
        }}
      >
        <section
          style={{
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
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#7a7166",
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              Customer Account
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 36,
                lineHeight: 1.1,
                color: "#171717",
                fontFamily: "var(--font-heading)",
              }}
            >
              {fullName || safeCustomer.email}
            </h1>

            <p style={{ margin: "10px 0 0", color: "#665d52", fontSize: 15 }}>
              {safeCustomer.company || "No company information"}
            </p>
            <p style={{ margin: "6px 0 0", color: "#665d52", fontSize: 15 }}>
              {safeCustomer.email}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <a
              href="/account/profile"
              style={{
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
              }}
            >
              Edit Profile
            </a>

            <form
              action="/api/customer-auth/logout"
              method="post"
              style={{ margin: 0 }}
            >
              <button
                type="submit"
                style={{
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
                }}
              >
                Sign Out
              </button>
            </form>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px minmax(0, 1fr)",
            gap: 24,
          }}
        >
          <aside
            style={{
              background: "#fff",
              border: "1px solid #e6ddd0",
              borderRadius: 28,
              padding: 24,
              boxShadow: "0 10px 30px rgba(23,23,23,0.05)",
              alignSelf: "start",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: 18,
                color: "#171717",
                fontFamily: "var(--font-heading)",
                fontSize: 24,
              }}
            >
              Account Details
            </h2>

            <div style={{ display: "grid", gap: 18 }}>
              <InfoRow label="Name" value={fullName || "-"} />
              <InfoRow label="Company" value={safeCustomer.company || "-"} />
              <InfoRow label="Phone" value={safeCustomer.phone || "-"} />
              <InfoRow label="Country" value={safeCustomer.country || "-"} />
              <InfoRow label="City" value={safeCustomer.city || "-"} />
              <InfoRow
                label="Address"
                value={safeCustomer.address_line_1 || "-"}
              />
              <InfoRow
                label="Postal Code"
                value={safeCustomer.postal_code || "-"}
              />
              <InfoRow label="Status" value={safeCustomer.status || "-"} />
              <InfoRow
                label="Last Login"
                value={safeCustomer.last_login_at || "-"}
              />
            </div>
          </aside>

          <section
            style={{
              background: "#fff",
              border: "1px solid #e6ddd0",
              borderRadius: 28,
              padding: 24,
              boxShadow: "0 10px 30px rgba(23,23,23,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 20,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#171717",
                    fontFamily: "var(--font-heading)",
                    fontSize: 24,
                  }}
                >
                  Previous Orders
                </h2>
                <p style={{ margin: "8px 0 0", color: "#665d52" }}>
                  A quick summary of your submitted orders.
                </p>
              </div>

              <div
                style={{
                  minWidth: 110,
                  textAlign: "center",
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: "#f4efe7",
                  color: "#171717",
                  fontWeight: 800,
                }}
              >
                {orders.length} Orders
              </div>
            </div>

            {orders.length === 0 ? (
              <div
                style={{
                  border: "1px dashed #d9cfbf",
                  borderRadius: 20,
                  padding: 28,
                  color: "#665d52",
                }}
              >
                No orders found for this account yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1.6fr) 0.9fr 0.9fr 0.9fr auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      borderRadius: 16,
                      border: "1px solid #eadfce",
                      background: "#fff",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: "#171717",
                          fontSize: 16,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {order.order_number}
                      </div>
                    </div>

                    <div
                      style={{
                        color: "#665d52",
                        fontSize: 14,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(order.created_at)}
                    </div>

                    <div
                      style={{
                        fontWeight: 700,
                        color: "#171717",
                        fontSize: 14,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatMoney(order.grand_total, order.currency)}
                    </div>

                    <div>
                      <span
                        style={{
                          ...statusPillStyle,
                          ...getStatusStyle(order.status),
                        }}
                      >
                        {order.status || "submitted"}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                        flexWrap: "wrap",
                      }}
                    >
                      <a
                        href={`/account/orders/${encodeURIComponent(order.order_number)}`}
                        style={ghostActionStyle}
                      >
                        View
                      </a>

                      <a
                        href="/cart"
                        onClick={(event) => {
                          event.preventDefault();
                          window.alert(
                            "Re-order will be connected next. For now, please open the order detail or place a new order from the catalog."
                          );
                          window.location.href = "/cart";
                        }}
                        style={darkActionStyle}
                      >
                        Re-order
                      </a>
                    </div>
                  </div>
                ))}
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
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#7a7166",
          fontWeight: 800,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ color: "#171717", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

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

const ghostActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
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

const darkActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 13,
  whiteSpace: "nowrap",
};