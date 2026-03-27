import { NextRequest, NextResponse } from "next/server";
import { parseCsvImportText } from "../../../../lib/import/csv-import";
import { parseJsonImportText } from "../../../../lib/import/json-import";
import {
  importRecords,
  validateSheetHeaders,
} from "../../../../lib/import-export";

export async function POST(req: NextRequest) {
  try {
    await validateSheetHeaders("products");

    const body = await req.json();
    const format = String(body?.format || "csv").trim().toLowerCase();
    const text = String(body?.text || "");

    if (!["csv", "json"].includes(format)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid import format. Use "csv" or "json".',
        },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { ok: false, error: "Import content is empty." },
        { status: 400 }
      );
    }

    const items =
      format === "json" ? parseJsonImportText(text) : parseCsvImportText(text);

    const result = await importRecords("products", items);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Import failed.",
      },
      { status: 500 }
    );
  }
}