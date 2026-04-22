import { NextRequest, NextResponse } from "next/server";
import {
  getBulkEditorConfig,
  getBulkEditorEditableKeys,
  getBulkEditorVisibleDefaultKeys,
} from "../../../../../lib/admin/bulk-editor-config";
import { getSheetData } from "../../../../../lib/sheets";
import { updateSheetObjectsByField } from "../../../../../lib/sheets-bulk";

type GenericSheetItem = Record<string, string>;

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function sanitizeCellValue(
  rawValue: unknown,
  columnType: string
): string {
  if (columnType === "boolean") {
    const value = String(rawValue ?? "").trim().toLowerCase();

    if (value === "true" || value === "1" || value === "yes") {
      return "TRUE";
    }

    if (value === "false" || value === "0" || value === "no") {
      return "FALSE";
    }

    return String(rawValue ?? "").trim().toUpperCase();
  }

  return String(rawValue ?? "").trim();
}

function sortItems(
  items: GenericSheetItem[],
  sortField?: string
): GenericSheetItem[] {
  if (!sortField) {
    return [...items];
  }

  return [...items].sort((a, b) => {
    const aValue = normalizeText(a[sortField]);
    const bValue = normalizeText(b[sortField]);
    return bValue.localeCompare(aValue);
  });
}

function matchesSearch(
  item: GenericSheetItem,
  searchableKeys: string[],
  query: string
): boolean {
  if (!query) {
    return true;
  }

  return searchableKeys.some((key) =>
    normalizeLower(item[key]).includes(query)
  );
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ entity: string }> }
) {
  try {
    const { entity } = await context.params;
    const config = getBulkEditorConfig(entity);

    const { searchParams } = new URL(req.url);
    const query = normalizeLower(searchParams.get("q"));
    const status = normalizeLower(searchParams.get("status"));
    const pageParam = Number(searchParams.get("page") || "1");
    const limitParam = Number(searchParams.get("limit") || "100");

    const page =
      Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 250)
        : 100;

    const items = (await getSheetData(config.sheetName, {
      ttlSeconds: 30,
      forceFresh: true,
    })) as GenericSheetItem[];

    const searchableKeys = config.columns.map((column) => column.key);

    let filtered = items.filter((item) =>
      normalizeText(item[config.keyField])
    );

    if (status) {
      filtered = filtered.filter(
        (item) => normalizeLower(item.status) === status
      );
    }

    if (query) {
      filtered = filtered.filter((item) =>
        matchesSearch(item, searchableKeys, query)
      );
    }

    const sorted = sortItems(filtered, config.sortField);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const end = start + limit;

    return NextResponse.json({
      ok: true,
      entity: config.entity,
      title: config.title,
      description: config.description,
      sheetName: config.sheetName,
      keyField: config.keyField,
      columns: config.columns,
      defaultVisibleColumnKeys: getBulkEditorVisibleDefaultKeys(entity),
      editableColumnKeys: getBulkEditorEditableKeys(entity),
      page: safePage,
      total,
      totalPages,
      limit,
      items: sorted.slice(start, end),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load bulk editor data.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ entity: string }> }
) {
  try {
    const { entity } = await context.params;
    const config = getBulkEditorConfig(entity);
    const body = await req.json().catch(() => null);

    if (!body || !Array.isArray(body.patches)) {
      return NextResponse.json(
        { ok: false, error: "'patches' must be an array." },
        { status: 400 }
      );
    }

    const editableKeys = new Set(getBulkEditorEditableKeys(entity));
    const columnMap = new Map(
      config.columns.map((column) => [column.key, column])
    );

    const patches = body.patches as Array<{
      id: string;
      changes: Record<string, unknown>;
    }>;

    if (!patches.length) {
      return NextResponse.json(
        { ok: false, error: "No patches were provided." },
        { status: 400 }
      );
    }

    const preparedPatches = patches.map((patch) => {
      const cleanChanges: Record<string, string> = {};

      Object.entries(patch.changes || {}).forEach(([key, value]) => {
        if (!editableKeys.has(key)) {
          return;
        }

        const column = columnMap.get(key);
        if (!column) {
          return;
        }

        cleanChanges[key] = sanitizeCellValue(value, column.type);
      });

      const updatedAtColumnExists = config.columns.some(
        (column) => column.key === "updated_at"
      );

      if (updatedAtColumnExists) {
        cleanChanges.updated_at = new Date().toISOString();
      }

      return {
        fieldValue: normalizeText(patch.id),
        changes: cleanChanges,
      };
    });

    const result = await updateSheetObjectsByField(
      config.sheetName,
      config.keyField,
      preparedPatches
    );

    return NextResponse.json(result, {
      status: result.ok ? 200 : 207,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save bulk editor changes.",
      },
      { status: 500 }
    );
  }
}