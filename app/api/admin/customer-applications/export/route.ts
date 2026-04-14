import { NextRequest, NextResponse } from "next/server";
import { buildCsvExport } from "../../../../../lib/export/csv-export";
import { buildJsonExport } from "../../../../../lib/export/json-export";
import { buildXmlExport } from "../../../../../lib/export/xml-export";
import {
  getExportData,
  validateSheetHeaders,
} from "../../../../../lib/import-export";
import { verifyAdminSessionToken } from "../../../../../lib/admin-auth";

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseAdminTokenFromCookie(cookieHeader);
    const isAdmin = await verifyAdminSessionToken(token);

    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    await validateSheetHeaders("customer_applications");

    const { searchParams } = new URL(req.url);
    const format = String(searchParams.get("format") || "csv")
      .trim()
      .toLowerCase();

    if (!["csv", "json", "xml"].includes(format)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid export format. Use "csv", "json", or "xml".',
        },
        { status: 400 }
      );
    }

    const { headers, items, xmlRoot, xmlItem } =
      await getExportData("customer_applications");

    if (format === "json") {
      const content = buildJsonExport(items);

      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="customer-applications.json"',
        },
      });
    }

    if (format === "xml") {
      const content = buildXmlExport(xmlRoot, xmlItem, headers, items);

      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="customer-applications.xml"',
        },
      });
    }

    const content = buildCsvExport(headers, items);

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="customer-applications.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Export failed.",
      },
      { status: 500 }
    );
  }
}