import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "../../../../lib/admin-auth";
import { getAllCheckoutSessions } from "../../../../lib/abandoned-checkouts";
import { toNumber } from "../../../../lib/money";

function getAdminTokenFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function safeDateTime(value: unknown) {
  const date = new Date(String(value || ""));

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
}

function getPercent(part: number, total: number) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(2));
}

export async function GET(req: Request) {
  try {
    const allowed = await isAuthenticatedAdmin(getAdminTokenFromRequest(req));

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const sessions = await getAllCheckoutSessions();

    const statusCounts = {
      active: 0,
      abandoned: 0,
      followed_up: 0,
      recovered: 0,
      dismissed: 0,
    };

    const stageCounts = {
      cart: 0,
      checkout_started: 0,
      contact_info: 0,
      shipping: 0,
      payment: 0,
      completed: 0,
    };

    let totalValue = 0;
    let activeValue = 0;
    let abandonedValue = 0;
    let recoveredValue = 0;
    let dismissedValue = 0;
    let followedUpValue = 0;

    let totalItemCount = 0;

    sessions.forEach((session) => {
      const status = normalizeLower(session.status || "active");
      const stage = normalizeLower(session.stage || "cart");
      const subtotal = toNumber(session.subtotal);
      const itemCount = toNumber(session.item_count);

      totalValue += subtotal;
      totalItemCount += itemCount;

      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts] += 1;
      }

      if (stage in stageCounts) {
        stageCounts[stage as keyof typeof stageCounts] += 1;
      }

      if (status === "active") {
        activeValue += subtotal;
      }

      if (status === "abandoned") {
        abandonedValue += subtotal;
      }

      if (status === "recovered") {
        recoveredValue += subtotal;
      }

      if (status === "dismissed") {
        dismissedValue += subtotal;
      }

      if (status === "followed_up") {
        followedUpValue += subtotal;
      }
    });

    const totalSessions = sessions.length;
    const completedOrRecovered =
      stageCounts.completed + statusCounts.recovered;
    const abandonedOrRecovered =
      statusCounts.abandoned + statusCounts.recovered;

    const conversionRate = getPercent(completedOrRecovered, totalSessions);
    const abandonmentRate = getPercent(statusCounts.abandoned, totalSessions);
    const recoveryRate = getPercent(
      statusCounts.recovered,
      abandonedOrRecovered
    );

    const averageCheckoutValue = totalSessions
      ? Number((totalValue / totalSessions).toFixed(2))
      : 0;

    const recentSessions = [...sessions]
      .sort((a, b) => {
        return (
          safeDateTime(b.last_activity_at || b.updated_at || b.created_at) -
          safeDateTime(a.last_activity_at || a.updated_at || a.created_at)
        );
      })
      .slice(0, 10);

    const stageBreakdown = Object.entries(stageCounts).map(([stage, count]) => {
      return {
        stage,
        count,
        rate: getPercent(count, totalSessions),
      };
    });

    const statusBreakdown = Object.entries(statusCounts).map(
      ([status, count]) => {
        return {
          status,
          count,
          rate: getPercent(count, totalSessions),
        };
      }
    );

    return NextResponse.json({
      ok: true,
      summary: {
        totalSessions,
        totalValue: Number(totalValue.toFixed(2)),
        activeValue: Number(activeValue.toFixed(2)),
        abandonedValue: Number(abandonedValue.toFixed(2)),
        recoveredValue: Number(recoveredValue.toFixed(2)),
        dismissedValue: Number(dismissedValue.toFixed(2)),
        followedUpValue: Number(followedUpValue.toFixed(2)),
        totalItemCount,
        averageCheckoutValue,
        conversionRate,
        abandonmentRate,
        recoveryRate,
      },
      statusCounts,
      stageCounts,
      statusBreakdown,
      stageBreakdown,
      recentSessions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load checkout analytics.",
      },
      { status: 500 }
    );
  }
}