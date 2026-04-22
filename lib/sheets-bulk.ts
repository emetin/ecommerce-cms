import { getSheetRows, updateSheetRowByRowNumber } from "./sheets";

type SheetRowObject = Record<string, string>;

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function rowsToHeaders(rows: string[][]): string[] {
  return rows[0]?.map((cell) => normalizeText(cell)) || [];
}

function buildRowObject(headers: string[], row: string[]): SheetRowObject {
  const item: SheetRowObject = {};

  headers.forEach((header, index) => {
    item[header] = normalizeText(row[index]);
  });

  return item;
}

function findFieldIndex(headers: string[], fieldName: string): number {
  const index = headers.findIndex((header) => header === fieldName);

  if (index === -1) {
    throw new Error(`Field "${fieldName}" was not found in sheet headers.`);
  }

  return index;
}

export async function getSheetRowsWithHeaders(sheetName: string): Promise<{
  headers: string[];
  rows: string[][];
  objects: SheetRowObject[];
}> {
  const rows = await getSheetRows(sheetName, {
    forceFresh: true,
    ttlSeconds: 0,
    mode: "catalog",
  });

  if (!rows.length) {
    return {
      headers: [],
      rows: [],
      objects: [],
    };
  }

  const headers = rowsToHeaders(rows);
  const objects = rows.slice(1).map((row) => buildRowObject(headers, row));

  return {
    headers,
    rows,
    objects,
  };
}

export async function updateSheetObjectByField(
  sheetName: string,
  fieldName: string,
  fieldValue: string,
  updates: Record<string, string>
) {
  const rows = await getSheetRows(sheetName, {
    forceFresh: true,
    ttlSeconds: 0,
    mode: "catalog",
  });

  if (!rows.length) {
    throw new Error(`Sheet "${sheetName}" is empty.`);
  }

  const headers = rowsToHeaders(rows);
  const fieldIndex = findFieldIndex(headers, fieldName);
  const normalizedTarget = normalizeLower(fieldValue);

  let matchedRowIndex = -1;

  for (let i = 1; i < rows.length; i += 1) {
    const currentValue = normalizeLower(rows[i]?.[fieldIndex]);

    if (currentValue === normalizedTarget) {
      matchedRowIndex = i;
      break;
    }
  }

  if (matchedRowIndex === -1) {
    throw new Error(
      `No record was found in "${sheetName}" for ${fieldName}="${fieldValue}".`
    );
  }

  const currentRow = rows[matchedRowIndex] || [];
  const nextRow = [...currentRow];

  headers.forEach((header, index) => {
    if (header in updates) {
      nextRow[index] = normalizeText(updates[header]);
    }
  });

  const rowNumber = matchedRowIndex + 1;

  await updateSheetRowByRowNumber(sheetName, rowNumber, nextRow);

  return { ok: true, rowNumber };
}

export async function updateSheetObjectsByField(
  sheetName: string,
  fieldName: string,
  patches: Array<{
    fieldValue: string;
    changes: Record<string, string>;
  }>
) {
  const results: Array<{
    fieldValue: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const patch of patches) {
    try {
      const fieldValue = normalizeText(patch.fieldValue);

      if (!fieldValue) {
        results.push({
          fieldValue: "",
          ok: false,
          error: `Missing ${fieldName}.`,
        });
        continue;
      }

      const changes = Object.fromEntries(
        Object.entries(patch.changes || {}).map(([key, value]) => [
          key,
          normalizeText(value),
        ])
      );

      if (!Object.keys(changes).length) {
        results.push({
          fieldValue,
          ok: false,
          error: "No valid changes provided.",
        });
        continue;
      }

      await updateSheetObjectByField(sheetName, fieldName, fieldValue, changes);

      results.push({
        fieldValue,
        ok: true,
      });
    } catch (error) {
      results.push({
        fieldValue: normalizeText(patch.fieldValue),
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown bulk update error.",
      });
    }
  }

  const successCount = results.filter((item) => item.ok).length;
  const failedCount = results.length - successCount;

  return {
    ok: failedCount === 0,
    summary: {
      total: results.length,
      successCount,
      failedCount,
    },
    results,
  };
}