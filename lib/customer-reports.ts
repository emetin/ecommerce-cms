import { getSheetData } from "./sheets";
import { toNumber } from "./money";

const CUSTOMERS_SHEET = "customers";
const ORDERS_SHEET = "orders";
const ORDER_ITEMS_SHEET = "order_items";

type CustomerRow = Record<string, string>;
type OrderRow = Record<string, string>;
type OrderItemRow = Record<string, string>;

export type ReportRangeKey =
  | "today"
  | "week"
  | "month"
  | "year"
  | "all"
  | "custom";

export type ReportRangeInput = {
  range?: ReportRangeKey;
  startDate?: string;
  endDate?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function parseDate(value: unknown) {
  const raw = normalizeText(value);
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function toStartOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toEndOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function subtractDays(days: number) {
  const date = toStartOfDay(new Date());
  date.setDate(date.getDate() - days);
  return date;
}

function getDateRange(input?: ReportRangeInput) {
  const range = input?.range || "month";

  if (range === "all") {
    return {
      range,
      start: null,
      end: null,
      label: "All Time",
    };
  }

  if (range === "custom") {
    const start = input?.startDate ? parseDate(input.startDate) : null;
    const end = input?.endDate ? parseDate(input.endDate) : null;

    return {
      range,
      start: start ? toStartOfDay(start) : null,
      end: end ? toEndOfDay(end) : null,
      label: "Custom Range",
    };
  }

  if (range === "today") {
    return {
      range,
      start: toStartOfDay(new Date()),
      end: null,
      label: "Today",
    };
  }

  if (range === "week") {
    return {
      range,
      start: subtractDays(6),
      end: null,
      label: "Last 7 Days",
    };
  }

  if (range === "year") {
    return {
      range,
      start: subtractDays(364),
      end: null,
      label: "Last 365 Days",
    };
  }

  return {
    range: "month" as ReportRangeKey,
    start: subtractDays(29),
    end: null,
    label: "Last 30 Days",
  };
}

function isInsideDateRange(dateValue: unknown, input?: ReportRangeInput) {
  const range = getDateRange(input);

  if (!range.start && !range.end) return true;

  const date = parseDate(dateValue);
  if (!date) return false;

  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;

  return true;
}

function getOrderTotal(order: OrderRow) {
  return toNumber(order.grand_total) || toNumber(order.subtotal) || 0;
}

function getOrderCurrency(order: OrderRow) {
  return normalizeText(order.currency || "USD") || "USD";
}

function getCustomerCompany(customer: CustomerRow) {
  return normalizeText(customer.company || customer.company_name);
}

function getCustomerName(customer: CustomerRow) {
  const firstName = normalizeText(customer.first_name);
  const lastName = normalizeText(customer.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || normalizeText(customer.contact_name);
}

function getCustomerCreatedAt(customer: CustomerRow) {
  return normalizeText(customer.created_at || customer.approved_at);
}

function matchesCustomer(order: OrderRow, customer: CustomerRow) {
  const customerId = normalizeText(customer.id);
  const customerEmail = normalizeLower(customer.email);
  const orderCustomerId = normalizeText(order.customer_id);
  const orderEmail = normalizeLower(order.email);

  if (customerId && orderCustomerId && customerId === orderCustomerId) {
    return true;
  }

  if (customerEmail && orderEmail && customerEmail === orderEmail) {
    return true;
  }

  return false;
}

function summarizeOrders(orders: OrderRow[]) {
  const totalOrders = orders.length;

  const totalRevenue = orders.reduce((sum, order) => {
    return sum + getOrderTotal(order);
  }, 0);

  const totalItems = orders.reduce((sum, order) => {
    return sum + toNumber(order.item_count);
  }, 0);

  return {
    totalOrders,
    totalRevenue,
    totalItems,
    averageOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
  };
}

function groupRevenueByDay(orders: OrderRow[]) {
  const map = new Map<
    string,
    {
      date: string;
      orders: number;
      revenue: number;
    }
  >();

  orders.forEach((order) => {
    const date = parseDate(order.created_at);
    if (!date) return;

    const key = date.toISOString().slice(0, 10);

    const current = map.get(key) || {
      date: key,
      orders: 0,
      revenue: 0,
    };

    current.orders += 1;
    current.revenue += getOrderTotal(order);

    map.set(key, current);
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function groupCustomersByDay(customers: CustomerRow[]) {
  const map = new Map<
    string,
    {
      date: string;
      customers: number;
    }
  >();

  customers.forEach((customer) => {
    const date = parseDate(getCustomerCreatedAt(customer));
    if (!date) return;

    const key = date.toISOString().slice(0, 10);

    const current = map.get(key) || {
      date: key,
      customers: 0,
    };

    current.customers += 1;

    map.set(key, current);
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildStatusBreakdown(orders: OrderRow[]) {
  const map = new Map<
    string,
    {
      status: string;
      count: number;
      revenue: number;
    }
  >();

  orders.forEach((order) => {
    const status = normalizeLower(order.status || "pending") || "pending";

    const current = map.get(status) || {
      status,
      count: 0,
      revenue: 0,
    };

    current.count += 1;
    current.revenue += getOrderTotal(order);

    map.set(status, current);
  });

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function buildTopProducts(orders: OrderRow[], orderItems: OrderItemRow[]) {
  const allowedOrderIds = new Set(
    orders.map((order) => normalizeText(order.id)).filter(Boolean)
  );

  const map = new Map<
    string,
    {
      product_slug: string;
      product_title: string;
      quantity: number;
      revenue: number;
      order_count: number;
    }
  >();

  orderItems.forEach((item) => {
    const orderId = normalizeText(item.order_id);
    if (!allowedOrderIds.has(orderId)) return;

    const productSlug = normalizeText(item.product_slug);
    const productTitle =
      normalizeText(item.product_title) || productSlug || "Product";
    const key = productSlug || productTitle;

    const quantity = toNumber(item.quantity);
    const revenue =
      toNumber(item.line_total) || toNumber(item.unit_price) * quantity;

    const current = map.get(key) || {
      product_slug: productSlug,
      product_title: productTitle,
      quantity: 0,
      revenue: 0,
      order_count: 0,
    };

    current.quantity += quantity;
    current.revenue += revenue;
    current.order_count += 1;

    map.set(key, current);
  });

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);
}

function buildTopCustomers(customers: CustomerRow[], orders: OrderRow[]) {
  return customers
    .map((customer) => {
      const customerOrders = orders.filter((order) =>
        matchesCustomer(order, customer)
      );

      const summary = summarizeOrders(customerOrders);

      return {
        id: normalizeText(customer.id),
        company: getCustomerCompany(customer),
        name: getCustomerName(customer),
        email: normalizeLower(customer.email),
        status: normalizeText(customer.status),
        price_tier: normalizeText(customer.price_tier || "standard") || "standard",
        totalOrders: summary.totalOrders,
        totalRevenue: summary.totalRevenue,
        totalItems: summary.totalItems,
        averageOrderValue: summary.averageOrderValue,
        lastOrderDate:
          customerOrders
            .map((order) => normalizeText(order.created_at))
            .filter(Boolean)
            .sort()
            .reverse()[0] || "",
      };
    })
    .filter((item) => item.totalOrders > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 20);
}

function buildNewCustomers(customers: CustomerRow[]) {
  return [...customers]
    .sort((a, b) => {
      const aTime = parseDate(getCustomerCreatedAt(a))?.getTime() || 0;
      const bTime = parseDate(getCustomerCreatedAt(b))?.getTime() || 0;
      return bTime - aTime;
    })
    .slice(0, 20)
    .map((customer) => ({
      id: normalizeText(customer.id),
      company: getCustomerCompany(customer),
      name: getCustomerName(customer),
      email: normalizeLower(customer.email),
      status: normalizeText(customer.status),
      price_tier: normalizeText(customer.price_tier || "standard") || "standard",
      created_at: getCustomerCreatedAt(customer),
    }));
}

export async function getAdminReportsSummary(input?: ReportRangeInput) {
  const [customers, orders, orderItems] = await Promise.all([
    getSheetData(CUSTOMERS_SHEET, {
      forceFresh: true,
      ttlSeconds: 0,
    }) as Promise<CustomerRow[]>,
    getSheetData(ORDERS_SHEET, {
      forceFresh: true,
      ttlSeconds: 0,
    }) as Promise<OrderRow[]>,
    getSheetData(ORDER_ITEMS_SHEET, {
      forceFresh: true,
      ttlSeconds: 0,
    }) as Promise<OrderItemRow[]>,
  ]);

  const selectedRange = getDateRange(input);

  const filteredOrders = orders.filter((order) =>
    isInsideDateRange(order.created_at, input)
  );

  const filteredCustomers = customers.filter((customer) =>
    isInsideDateRange(getCustomerCreatedAt(customer), input)
  );

  const summary = summarizeOrders(filteredOrders);

  const activeCustomers = customers.filter(
    (customer) => normalizeLower(customer.status) === "active"
  ).length;

  const inactiveCustomers = customers.length - activeCustomers;

  const topCustomers = buildTopCustomers(customers, filteredOrders);
  const spendingCustomers = topCustomers.length;

  return {
    range: selectedRange,
    summary: {
      totalCustomers: customers.length,
      activeCustomers,
      inactiveCustomers,

      newCustomers: filteredCustomers.length,
      spendingCustomers,
      nonSpendingCustomers: Math.max(activeCustomers - spendingCustomers, 0),

      totalOrders: summary.totalOrders,
      totalRevenue: summary.totalRevenue,
      totalItems: summary.totalItems,
      averageOrderValue: summary.averageOrderValue,
      revenuePerSpendingCustomer: spendingCustomers
        ? summary.totalRevenue / spendingCustomers
        : 0,

      currency: getOrderCurrency(filteredOrders[0] || orders[0] || {}),
    },
    revenueByDay: groupRevenueByDay(filteredOrders).slice(-60),
    customerGrowthByDay: groupCustomersByDay(filteredCustomers).slice(-60),
    statusBreakdown: buildStatusBreakdown(filteredOrders),
    topCustomers,
    newCustomersList: buildNewCustomers(filteredCustomers),
    topProducts: buildTopProducts(filteredOrders, orderItems),
  };
}

export async function getCustomerAnalytics(
  customerId: string,
  input?: ReportRangeInput
) {
  const [customers, orders, orderItems] = await Promise.all([
    getSheetData(CUSTOMERS_SHEET, {
      forceFresh: true,
      ttlSeconds: 0,
    }) as Promise<CustomerRow[]>,
    getSheetData(ORDERS_SHEET, {
      forceFresh: true,
      ttlSeconds: 0,
    }) as Promise<OrderRow[]>,
    getSheetData(ORDER_ITEMS_SHEET, {
      forceFresh: true,
      ttlSeconds: 0,
    }) as Promise<OrderItemRow[]>,
  ]);

  const customer =
    customers.find(
      (item) => normalizeText(item.id) === normalizeText(customerId)
    ) || null;

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const allCustomerOrders = orders.filter((order) =>
    matchesCustomer(order, customer)
  );

  const filteredOrders = allCustomerOrders.filter((order) =>
    isInsideDateRange(order.created_at, input)
  );

  const summary = summarizeOrders(filteredOrders);
  const selectedRange = getDateRange(input);

  const recentOrders = [...filteredOrders]
    .sort((a, b) => {
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    })
    .slice(0, 8)
    .map((order) => ({
      id: normalizeText(order.id),
      order_number: normalizeText(order.order_number),
      status: normalizeText(order.status || "pending"),
      currency: getOrderCurrency(order),
      grand_total: getOrderTotal(order),
      subtotal: toNumber(order.subtotal),
      created_at: normalizeText(order.created_at),
      updated_at: normalizeText(order.updated_at),
    }));

  const lastOrderDate =
    recentOrders.length > 0 ? normalizeText(recentOrders[0].created_at) : "";

  return {
    range: selectedRange,
    customer: {
      id: normalizeText(customer.id),
      company: getCustomerCompany(customer),
      name: getCustomerName(customer),
      email: normalizeLower(customer.email),
      status: normalizeText(customer.status),
      price_tier: normalizeText(customer.price_tier || "standard") || "standard",
      currency: normalizeText(customer.currency || "USD") || "USD",
    },
    metrics: {
      totalOrders: summary.totalOrders,
      totalRevenue: summary.totalRevenue,
      totalItems: summary.totalItems,
      averageOrderValue: summary.averageOrderValue,
      lastOrderDate,
    },
    recentOrders,
    topProducts: buildTopProducts(filteredOrders, orderItems),
    revenueByDay: groupRevenueByDay(filteredOrders).slice(-60),
  };
}