import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../../../../lib/customer-auth";
import {
  findCustomerById,
  getOrdersForCustomer,
} from "../../../../../lib/customer-account";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeNumber(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await context.params;
    const normalizedOrderNumber = normalizeText(orderNumber);

    if (!normalizedOrderNumber) {
      return NextResponse.json(
        { ok: false, error: "Order number is required." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value || null;
    const session = await readCustomerFromSessionToken(token);

    if (!session?.customerId) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const customer = await findCustomerById(session.customerId);

    if (!customer) {
      return NextResponse.json(
        { ok: false, error: "Customer not found." },
        { status: 404 }
      );
    }

    const orders = await getOrdersForCustomer({
      customerId: customer.id,
      email: customer.email,
    });

    const order = orders.find(
      (item) => normalizeText(item.order_number) === normalizedOrderNumber
    );

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: normalizeText(order.id),
        order_number: normalizeText(order.order_number),
        status: normalizeText(order.status),
        currency: normalizeText(order.currency || "USD"),
        subtotal: normalizeNumber(order.subtotal),
        discount_total: normalizeNumber(order.discount_total),
        shipping_total: normalizeNumber(order.shipping_total),
        tax_total: normalizeNumber(order.tax_total),
        grand_total: normalizeNumber(order.grand_total),
        item_count: normalizeNumber(order.item_count),
        first_name: normalizeText(order.first_name),
        last_name: normalizeText(order.last_name),
        company: normalizeText(order.company),
        email: normalizeText(order.email),
        phone: normalizeText(order.phone),
        country: normalizeText(order.country),
        city: normalizeText(order.city),
        address_line_1: normalizeText(order.address_line_1),
        address_line_2: normalizeText(order.address_line_2),
        postal_code: normalizeText(order.postal_code),
        note: normalizeText(order.note),
        created_at: normalizeText(order.created_at),
      },
      items: (order.items || []).map((item) => ({
        id: normalizeText(item.id),
        product_slug: normalizeText(item.product_slug),
        variant_id: normalizeText(item.variant_id),
        product_title: normalizeText(item.product_title),
        variant_title: normalizeText(item.variant_title),
        sku: normalizeText(item.sku),
        image: normalizeText(item.image),
        quantity: normalizeNumber(item.quantity),
        unit_price: normalizeNumber(item.unit_price),
        line_total: normalizeNumber(item.line_total),
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load order.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}