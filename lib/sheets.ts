import { google } from "googleapis";
import { revalidateTag, unstable_cache } from "next/cache";
import {
  deleteCacheByPrefix,
  getCache,
  getOrSetCache,
  setCache,
} from "./cache";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const FORMS_SHEET_ID = process.env.GOOGLE_FORMS_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const DEFAULT_TTL_SECONDS = 300;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY_MS = 500;
const SHEET_RANGE = "A:ZZ";

if (!SHEET_ID) {
  throw new Error("Missing GOOGLE_SHEET_ID.");
}

if (!CLIENT_EMAIL) {
  throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL.");
}

if (!PRIVATE_KEY) {
  throw new Error("Missing GOOGLE_PRIVATE_KEY.");
}

let sheetsClientInstance: ReturnType<typeof google.sheets> | null = null;

export type SheetObject = Record<string, string>;

function getAuth() {
  return new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  if (sheetsClientInstance) {
    return sheetsClientInstance;
  }

  const auth = getAuth();

  sheetsClientInstance = google.sheets({
    version: "v4",
    auth,
  });

  return sheetsClientInstance;
}

function getSpreadsheetId(mode: "catalog" | "forms" = "catalog") {
  if (mode === "forms") {
    if (!FORMS_SHEET_ID) {
      throw new Error("Missing GOOGLE_FORMS_SHEET_ID.");
    }

    return FORMS_SHEET_ID;
  }

  return SHEET_ID!;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  operation: () => Promise<T>,
  retries = DEFAULT_RETRY_COUNT,
  delayMs = DEFAULT_RETRY_DELAY_MS
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        await sleep(delayMs * attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Google Sheets request failed.");
}

function getRowsCacheKey(sheetName: string, ttlSeconds: number) {
  return `sheet:rows:${sheetName}:${ttlSeconds}`;
}

function getHeadersCacheKey(sheetName: string, ttlSeconds: number) {
  return `sheet:headers:${sheetName}:${ttlSeconds}`;
}

function getObjectsCacheKey(sheetName: string, ttlSeconds: number) {
  return `sheet:objects:${sheetName}:${ttlSeconds}`;
}

function getMetaCacheKey(sheetName: string, ttlSeconds: number) {
  return `sheet:meta:${sheetName}:${ttlSeconds}`;
}

function getSheetTag(sheetName: string) {
  return `sheet:${sheetName}`;
}

function clearSheetLocalCache(sheetName: string) {
  deleteCacheByPrefix(`sheet:rows:${sheetName}:`);
  deleteCacheByPrefix(`sheet:headers:${sheetName}:`);
  deleteCacheByPrefix(`sheet:objects:${sheetName}:`);
  deleteCacheByPrefix(`sheet:meta:${sheetName}:`);
  deleteCacheByPrefix(`sheet:${sheetName}:`);
}

function invalidateSheet(sheetName: string) {
  clearSheetLocalCache(sheetName);
  revalidateTag(getSheetTag(sheetName), "max");
}

function normalizeCellValue(value: unknown) {
  return String(value || "").trim();
}

function normalizeCellValueLower(value: unknown) {
  return normalizeCellValue(value).toLowerCase();
}

async function fetchSheetRowsUncached(sheetName: string): Promise<string[][]> {
  const sheets = getSheetsClient();

  return withRetry(async () => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId("catalog"),
      range: `${sheetName}!${SHEET_RANGE}`,
    });

    return (response.data.values || []) as string[][];
  });
}

function getCachedSheetRowsLoader(sheetName: string, ttlSeconds: number) {
  return unstable_cache(
    async () => fetchSheetRowsUncached(sheetName),
    ["google-sheet-rows", sheetName, String(ttlSeconds)],
    {
      revalidate: ttlSeconds,
      tags: [getSheetTag(sheetName)],
    }
  );
}

export async function getSheetRows(
  sheetName: string,
  options?: { forceFresh?: boolean; ttlSeconds?: number }
) {
  const forceFresh = options?.forceFresh ?? false;
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;

  if (forceFresh) {
    return fetchSheetRowsUncached(sheetName);
  }

  const cacheKey = getRowsCacheKey(sheetName, ttlSeconds);

  return getOrSetCache<string[][]>(
    cacheKey,
    async () => {
      const loader = getCachedSheetRowsLoader(sheetName, ttlSeconds);
      return loader();
    },
    ttlSeconds
  );
}

export function rowsToObjects(rows: string[][]) {
  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((header) => String(header).trim());

  return rows.slice(1).map((row) => {
    const item: Record<string, string> = {};

    headers.forEach((header, index) => {
      item[header] = row[index] ? String(row[index]) : "";
    });

    return item;
  });
}

export async function getSheetData(
  sheetName: string,
  options?: { forceFresh?: boolean; ttlSeconds?: number }
) {
  const forceFresh = options?.forceFresh ?? false;
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;

  if (forceFresh) {
    const rows = await fetchSheetRowsUncached(sheetName);
    return rowsToObjects(rows);
  }

  const cacheKey = getObjectsCacheKey(sheetName, ttlSeconds);
  const cached = getCache<SheetObject[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const rows = await getSheetRows(sheetName, {
    forceFresh: false,
    ttlSeconds,
  });

  const data = rowsToObjects(rows);
  setCache(cacheKey, data, ttlSeconds);

  return data;
}

export async function getSheetHeaders(
  sheetName: string,
  options?: { forceFresh?: boolean; ttlSeconds?: number }
) {
  const forceFresh = options?.forceFresh ?? false;
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;

  if (forceFresh) {
    const rows = await fetchSheetRowsUncached(sheetName);
    return rows[0]?.map((item) => String(item).trim()) || [];
  }

  const cacheKey = getHeadersCacheKey(sheetName, ttlSeconds);
  const cached = getCache<string[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const rows = await getSheetRows(sheetName, {
    forceFresh: false,
    ttlSeconds,
  });

  const headers = rows[0]?.map((item) => String(item).trim()) || [];
  setCache(cacheKey, headers, ttlSeconds);

  return headers;
}

export async function findSheetItemByField<T extends SheetObject>(
  sheetName: string,
  fieldName: string,
  fieldValue: string,
  options?: { forceFresh?: boolean; ttlSeconds?: number }
) {
  const data = (await getSheetData(sheetName, options)) as T[];
  const normalizedTarget = normalizeCellValueLower(fieldValue);

  return (
    data.find(
      (item) => normalizeCellValueLower(item[fieldName]) === normalizedTarget
    ) || null
  );
}

export async function findSheetItemsByField<T extends SheetObject>(
  sheetName: string,
  fieldName: string,
  fieldValue: string,
  options?: { forceFresh?: boolean; ttlSeconds?: number }
) {
  const data = (await getSheetData(sheetName, options)) as T[];
  const normalizedTarget = normalizeCellValueLower(fieldValue);

  return data.filter(
    (item) => normalizeCellValueLower(item[fieldName]) === normalizedTarget
  );
}

export async function findRowNumberByField(
  sheetName: string,
  fieldName: string,
  fieldValue: string
) {
  const rows = await getSheetRows(sheetName, { ttlSeconds: DEFAULT_TTL_SECONDS });

  if (!rows.length) {
    return null;
  }

  const headers = rows[0].map((header) => String(header).trim());
  const fieldIndex = headers.findIndex((header) => header === fieldName);

  if (fieldIndex === -1) {
    throw new Error(`Field "${fieldName}" was not found in "${sheetName}".`);
  }

  const normalizedValue = String(fieldValue).trim().toLowerCase();

  for (let i = 1; i < rows.length; i += 1) {
    const rowValue = String(rows[i]?.[fieldIndex] || "")
      .trim()
      .toLowerCase();

    if (rowValue === normalizedValue) {
      return i + 1;
    }
  }

  return null;
}

export async function getSheetRowNumberMapByField(
  sheetName: string,
  fieldName: string
) {
  const rows = await getSheetRows(sheetName, { ttlSeconds: DEFAULT_TTL_SECONDS });

  if (!rows.length) {
    return new Map<string, number>();
  }

  const headers = rows[0].map((header) => String(header).trim());
  const fieldIndex = headers.findIndex((header) => header === fieldName);

  if (fieldIndex === -1) {
    throw new Error(`Field "${fieldName}" was not found in "${sheetName}".`);
  }

  const map = new Map<string, number>();

  for (let i = 1; i < rows.length; i += 1) {
    const value = String(rows[i]?.[fieldIndex] || "").trim().toLowerCase();

    if (value) {
      map.set(value, i + 1);
    }
  }

  return map;
}

function columnNumberToLetter(columnNumber: number) {
  let temp = columnNumber;
  let letter = "";

  while (temp > 0) {
    const remainder = (temp - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    temp = Math.floor((temp - 1) / 26);
  }

  return letter;
}

export async function appendSheetRow(sheetName: string, row: string[]) {
  const sheets = getSheetsClient();

  await withRetry(async () => {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId("catalog"),
      range: `${sheetName}!${SHEET_RANGE}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
  });

  invalidateSheet(sheetName);

  return { ok: true };
}

export async function appendSheetRows(sheetName: string, rows: string[][]) {
  if (!rows.length) {
    return { ok: true };
  }

  const sheets = getSheetsClient();

  await withRetry(async () => {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId("catalog"),
      range: `${sheetName}!${SHEET_RANGE}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    });
  });

  invalidateSheet(sheetName);

  return { ok: true };
}

export async function appendFormSheetRow(sheetName: string, row: string[]) {
  const sheets = getSheetsClient();

  await withRetry(async () => {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId("forms"),
      range: `${sheetName}!${SHEET_RANGE}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
  });

  return { ok: true };
}

export async function getFormSheetData(sheetName: string) {
  const sheets = getSheetsClient();

  const rows = await withRetry(async () => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId("forms"),
      range: `${sheetName}!${SHEET_RANGE}`,
    });

    return (response.data.values || []) as string[][];
  });

  return rowsToObjects(rows);
}

export async function updateSheetRowByRowNumber(
  sheetName: string,
  rowNumber: number,
  rowValues: string[]
) {
  const sheets = getSheetsClient();
  const lastColumnLetter = columnNumberToLetter(rowValues.length);

  await withRetry(async () => {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId("catalog"),
      range: `${sheetName}!A${rowNumber}:${lastColumnLetter}${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowValues],
      },
    });
  });

  invalidateSheet(sheetName);

  return { ok: true };
}

export async function updateSheetRowBySlug(
  sheetName: string,
  slug: string,
  rowValues: string[]
) {
  const rowNumber = await findRowNumberByField(sheetName, "slug", slug);

  if (!rowNumber) {
    throw new Error(`No record was found in "${sheetName}" for this slug.`);
  }

  return updateSheetRowByRowNumber(sheetName, rowNumber, rowValues);
}

export async function getSheetMetaByTitle(
  sheetName: string,
  options?: { forceFresh?: boolean; ttlSeconds?: number }
) {
  const forceFresh = options?.forceFresh ?? false;
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;

  if (forceFresh) {
    const sheets = getSheetsClient();

    const response = await withRetry(async () => {
      return sheets.spreadsheets.get({
        spreadsheetId: getSpreadsheetId("catalog"),
      });
    });

    const sheet = response.data.sheets?.find(
      (item) => item.properties?.title === sheetName
    );

    if (!sheet?.properties?.sheetId) {
      throw new Error(`Sheet metadata was not found for "${sheetName}".`);
    }

    return {
      sheetId: sheet.properties.sheetId,
      title: sheet.properties.title || sheetName,
    };
  }

  const cacheKey = getMetaCacheKey(sheetName, ttlSeconds);
  const cached = getCache<{ sheetId: number; title: string }>(cacheKey);

  if (cached) {
    return cached;
  }

  const result = await getOrSetCache(
    cacheKey,
    async () => {
      const sheets = getSheetsClient();

      const response = await withRetry(async () => {
        return sheets.spreadsheets.get({
          spreadsheetId: getSpreadsheetId("catalog"),
        });
      });

      const sheet = response.data.sheets?.find(
        (item) => item.properties?.title === sheetName
      );

      if (!sheet?.properties?.sheetId) {
        throw new Error(`Sheet metadata was not found for "${sheetName}".`);
      }

      return {
        sheetId: sheet.properties.sheetId,
        title: sheet.properties.title || sheetName,
      };
    },
    ttlSeconds
  );

  return result;
}

export async function deleteSheetRowBySlug(sheetName: string, slug: string) {
  const rowNumber = await findRowNumberByField(sheetName, "slug", slug);

  if (!rowNumber) {
    throw new Error(`No record was found in "${sheetName}" for this slug.`);
  }

  const sheets = getSheetsClient();
  const meta = await getSheetMetaByTitle(sheetName);

  await withRetry(async () => {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId("catalog"),
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: meta.sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });
  });

  invalidateSheet(sheetName);

  return { ok: true };
}

export async function deleteSheetRowsByField(
  sheetName: string,
  fieldName: string,
  fieldValue: string
) {
  const rows = await getSheetRows(sheetName, {
    forceFresh: true,
    ttlSeconds: 0,
  });

  if (!rows.length) {
    return { ok: true, deletedCount: 0 };
  }

  const headers = rows[0].map((header) => String(header).trim());
  const fieldIndex = headers.findIndex((header) => header === fieldName);

  if (fieldIndex === -1) {
    throw new Error(`Field "${fieldName}" was not found in "${sheetName}".`);
  }

  const normalizedTarget = String(fieldValue).trim().toLowerCase();
  const matchingRowNumbers: number[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const rowValue = String(rows[i]?.[fieldIndex] || "")
      .trim()
      .toLowerCase();

    if (rowValue === normalizedTarget) {
      matchingRowNumbers.push(i + 1);
    }
  }

  if (!matchingRowNumbers.length) {
    return { ok: true, deletedCount: 0 };
  }

  const sheets = getSheetsClient();
  const meta = await getSheetMetaByTitle(sheetName, {
    forceFresh: true,
    ttlSeconds: 0,
  });

  const requests = matchingRowNumbers
    .sort((a, b) => b - a)
    .map((rowNumber) => ({
      deleteDimension: {
        range: {
          sheetId: meta.sheetId,
          dimension: "ROWS" as const,
          startIndex: rowNumber - 1,
          endIndex: rowNumber,
        },
      },
    }));

  await withRetry(async () => {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId("catalog"),
      requestBody: {
        requests,
      },
    });
  });

  invalidateSheet(sheetName);

  return {
    ok: true,
    deletedCount: matchingRowNumbers.length,
  };
}

export async function deleteSheetRowByField(
  sheetName: string,
  fieldName: string,
  fieldValue: string
) {
  const result = await deleteSheetRowsByField(sheetName, fieldName, fieldValue);

  return {
    ok: result.ok,
    deleted: result.deletedCount > 0,
  };
}

export async function replaceSheetRows(
  sheetName: string,
  rows: string[][]
) {
  const sheets = getSheetsClient();

  await withRetry(async () => {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: getSpreadsheetId("catalog"),
      range: `${sheetName}!${SHEET_RANGE}`,
    });

    if (rows.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: getSpreadsheetId("catalog"),
        range: `${sheetName}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: rows,
        },
      });
    }
  });

  invalidateSheet(sheetName);

  return { ok: true };
}