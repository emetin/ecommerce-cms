import { NextRequest, NextResponse } from "next/server";
import { buildCsvExport } from "../../../../lib/export/csv-export";
import { buildJsonExport } from "../../../../lib/export/json-export";
import { buildXmlExport } from "../../../../lib/export/xml-export";
import {
  getExportData,
  validateSheetHeaders,
} from "../../../../lib/import-export";

export async function GET(req: NextRequest) {
  try {
    await validateSheetHeaders("products");

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

    const { headers, items, xmlRoot, xmlItem } = await getExportData("products");

    if (format === "json") {
      const content = buildJsonExport(items);

      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="products.json"',
        },
      });
    }

    if (format === "xml") {
      const content = buildXmlExport(xmlRoot, xmlItem, headers, items);

      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": 'attachment; filename="products.xml"',
        },
      });
    }

    const content = buildCsvExport(headers, items);

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="products.csv"',
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