import { google } from "googleapis";
import { revalidateTag, unstable_cache } from "next/cache";
import {
  deleteCacheByPrefix,
  getOrSetCache,
} from "./cache";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const FORMS_SHEET_ID = process.env.GOOGLE_FORMS_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const DEFAULT_TTL_SECONDS = 300;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY_MS = 500;
const DEFAULT_SHEET_RANGE = "A:ZZ";

if (!SHEET_ID) {
  throw new Error("Missing GOOGLE_SHEET_ID.");
}

if (!CLIENT_EMAIL) {
  throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL.");
}

if (!PRIVATE_KEY) {
  throw new Error("Missing GOOGLE_PRIVATE_KEY.");
}

export type SheetObject = Record<string, string>;

type SpreadsheetMode = "catalog" | "forms";

type SheetMeta = {
  sheetId: number;
  title: string;
};

let jwtAuthInstance: InstanceType<typeof google.auth.JWT> | null = null;
let sheetsCatalogClientInstance: ReturnType<typeof google.sheets> | null = null;
let sheetsFormsClientInstance: ReturnType<typeof google.sheets> | null = null;

/**
 * Buradaki mapping ile tüm sheet'leri A:ZZ yerine daha dar range ile okuyabiliriz.
 * İstersen kendi header sayına göre daha da daraltabilirsin.
 */
const SHEET_RANGE_MAP: Record<string, string> = {
  Products: "A:R",
  Collections: "A:J",
  Blog: "A:L",
  product_variants: "A:Z",
  product_images: "A:K",
};

function getAuth() {
  if (jwtAuthInstance) {
    return jwtAuthInstance;
  }

  jwtAuthInstance = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return jwtAuthInstance;
}

function getSheetsClient(mode: SpreadsheetMode = "catalog") {
  if (mode === "forms") {
    if (sheetsFormsClientInstance) {
      return sheetsFormsClientInstance;
    }

    sheetsFormsClientInstance = google.sheets({
      version: "v4",
      auth: getAuth(),
    });

    return sheetsFormsClientInstance;
  }

  if (sheetsCatalogClientInstance) {
    return sheetsCatalogClientInstance;
  }

  sheetsCatalogClientInstance = google.sheets({
    version: "v4",
    auth: getAuth(),
  });

  return sheetsCatalogClientInstance;
}

function getSpreadsheetId(mode: SpreadsheetMode = "catalog") {
  if (mode === "forms") {
    if (!FORMS_SHEET_ID) {
      throw new Error("Missing GOOGLE_FORMS_SHEET_ID.");
    }

    return FORMS_SHEET_ID;
  }

  return SHEET_ID!;
}

function getSheetRange(sheetName: string) {
  return SHEET_RANGE_MAP[sheetName] || DEFAULT_SHEET_RANGE;
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

function getRowsCacheKey(
  sheetName: string,
  ttlSeconds: number,
  mode: SpreadsheetMode = "catalog"
) {
  return `sheet:rows:${mode}:${sheetName}:${ttlSeconds}`;
}

function getHeadersCacheKey(
  sheetName: string,
  ttlSeconds: number,
  mode: SpreadsheetMode = "catalog"
) {
  return `sheet:headers:${mode}:${sheetName}:${ttlSeconds}`;
}

function getObjectsCacheKey(
  sheetName: string,
  ttlSeconds: number,
  mode: SpreadsheetMode = "catalog"
) {
  return `sheet:objects:${mode}:${sheetName}:${ttlSeconds}`;
}

function getMetaCacheKey(ttlSeconds: number) {
  return `sheet:meta:catalog:all:${ttlSeconds}`;
}

function getSheetTag(sheetName: string, mode: SpreadsheetMode = "catalog") {
  return `sheet:${mode}:${sheetName}`;
}

function clearSheetLocalCache(
  sheetName: string,
  mode: SpreadsheetMode = "catalog"
) {
  deleteCacheByPrefix(`sheet:rows:${mode}:${sheetName}:`);
  deleteCacheByPrefix(`sheet:headers:${mode}:${sheetName}:`);
  deleteCacheByPrefix(`sheet:objects:${mode}:${sheetName}:`);

  if (mode === "catalog") {
    deleteCacheByPrefix(`sheet:meta:catalog:all:`);
  }
}

function invalidateSheet(sheetName: string, mode: SpreadsheetMode = "catalog") {
  clearSheetLocalCache(sheetName, mode);
  revalidateTag(getSheetTag(sheetName, mode), "max");
}

function normalizeCellValue(value: unknown) {
  return String(value || "").trim();
}

function normalizeCellValueLower(value: unknown) {
  return normalizeCellValue(value).toLowerCase();
}

async function fetchSheetRowsUncached(
  sheetName: string,
  mode: SpreadsheetMode = "catalog"
): Promise<string[][]> {
  const sheets = getSheetsClient(mode);
  const range = getSheetRange(sheetName);

  return withRetry(async () => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(mode),
      range: `${sheetName}!${range}`,
    });

    return (response.data.values || []) as string[][];
  });
}

function getCachedSheetRowsLoader(
  sheetName: string,
  ttlSeconds: number,
  mode: SpreadsheetMode = "catalog"
) {
  return unstable_cache(
    async () => fetchSheetRowsUncached(sheetName, mode),
    ["google-sheet-rows", mode, sheetName, String(ttlSeconds)],
    {
      revalidate: ttlSeconds,
      tags: [getSheetTag(sheetName, mode)],
    }
  );
}

async function getAllCatalogSheetMetaUncached(): Promise<SheetMeta[]> {
  const sheets = getSheetsClient("catalog");

  const response = await withRetry(async () => {
    return sheets.spreadsheets.get({
      spreadsheetId: getSpreadsheetId("catalog"),
    });
  });

  return (response.data.sheets || [])
    .map((sheet) => {
      const sheetId = sheet.properties?.sheetId;
      const title = sheet.properties?.title;

      if (!sheetId || !title) {
        return null;
      }

      return {
        sheetId,
        title,
      };
    })
    .filter(Boolean) as SheetMeta[];
}

function rowsToHeaders(rows: string[][]) {
  return rows[0]?.map((item) => String(item).trim()) || [];
}

export function rowsToObjects(rows: string[][]) {
  if (!rows.length) {
    return [];
  }

  const headers = rowsToHeaders(rows);

  return rows.slice(1).map((row) => {
    const item: Record<string, string> = {};

    headers.forEach((header, index) => {
      item[header] = row[index] ? String(row[index]) : "";
    });

    return item;
  });
}

export async function getSheetRows(
  sheetName: string,
  options?: {
    forceFresh?: boolean;
    ttlSeconds?: number;
    mode?: SpreadsheetMode;
  }
) {
  const forceFresh = options?.forceFresh ?? false;
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const mode = options?.mode ?? "catalog";

  if (forceFresh) {
    return fetchSheetRowsUncached(sheetName, mode);
  }

  const cacheKey = getRowsCacheKey(sheetName, ttlSeconds, mode);

  return getOrSetCache<string[][]>(
    cacheKey,
    async () => {
      const loader = getCachedSheetRowsLoader(sheetName, ttlSeconds, mode);
      return loader();
    },
    ttlSeconds
  );
}

export async function getSheetData(
  sheetName: string,
  options?: {
    forceFresh?: boolean;
    ttlSeconds?: number;
    mode?: SpreadsheetMode;
  }
) {
  const forceFresh = options?.forceFresh ?? false;
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const mode = options?.mode ?? "catalog";

  if (forceFresh) {
    const rows = await fetchSheetRowsUncached(sheetName, mode);
    return rowsToObjects(rows);
  }

  const cacheKey = getObjectsCacheKey(sheetName, ttlSeconds, mode);

  return getOrSetCache<SheetObject[]>(
    cacheKey,
    async () => {
      const rows = await getSheetRows(sheetName, {
        forceFresh: false,
        ttlSeconds,
        mode,
      });

      return rowsToObjects(rows);
    },
    ttlSeconds
  );
}

export async function getSheetHeaders(
  sheetName: string,
  options?: {
    forceFresh?: boolean;
    ttlSeconds?: number;
    mode?: SpreadsheetMode;
  }
) {
  const forceFresh = options?.forceFresh ?? false;
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const mode = options?.mode ?? "catalog";

  if (forceFresh) {
    const rows = await fetchSheetRowsUncached(sheetName, mode);
    return rowsToHeaders(rows);
  }

  const cacheKey = getHeadersCacheKey(sheetName, ttlSeconds, mode);

  return getOrSetCache<string[]>(
    cacheKey,
    async () => {
      const rows = await getSheetRows(sheetName, {
        forceFresh: false,
        ttlSeconds,
        mode,
      });

      return rowsToHeaders(rows);
    },
    ttlSeconds
  );
}

export async function findSheetItemByField<T extends SheetObject>(
  sheetName: string,
  fieldName: string,
  fieldValue: string,
  options?: {
    forceFresh?: boolean;
    ttlSeconds?: number;
    mode?: SpreadsheetMode;
  }
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
  options?: {
    forceFresh?: boolean;
    ttlSeconds?: number;
    mode?: SpreadsheetMode;
  }
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
  const rows = await getSheetRows(sheetName, {
    ttlSeconds: DEFAULT_TTL_SECONDS,
    mode: "catalog",
  });

  if (!rows.length) {
    return null;
  }

  const headers = rowsToHeaders(rows);
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
  const rows = await getSheetRows(sheetName, {
    ttlSeconds: DEFAULT_TTL_SECONDS,
    mode: "catalog",
  });

  if (!rows.length) {
    return new Map<string, number>();
  }

  const headers = rowsToHeaders(rows);
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
  const sheets = getSheetsClient("catalog");

  await withRetry(async () => {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId("catalog"),
      range: `${sheetName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
  });

  invalidateSheet(sheetName, "catalog");

  return { ok: true };
}

export async function appendSheetRows(sheetName: string, rows: string[][]) {
  if (!rows.length) {
    return { ok: true };
  }

  const sheets = getSheetsClient("catalog");

  await withRetry(async () => {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId("catalog"),
      range: `${sheetName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    });
  });

  invalidateSheet(sheetName, "catalog");

  return { ok: true };
}

export async function appendFormSheetRow(sheetName: string, row: string[]) {
  const sheets = getSheetsClient("forms");

  await withRetry(async () => {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId("forms"),
      range: `${sheetName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
  });

  invalidateSheet(sheetName, "forms");

  return { ok: true };
}

export async function getFormSheetData(
  sheetName: string,
  options?: { forceFresh?: boolean; ttlSeconds?: number }
) {
  return getSheetData(sheetName, {
    forceFresh: options?.forceFresh ?? false,
    ttlSeconds: options?.ttlSeconds ?? DEFAULT_TTL_SECONDS,
    mode: "forms",
  });
}

export async function updateSheetRowByRowNumber(
  sheetName: string,
  rowNumber: number,
  rowValues: string[]
) {
  const sheets = getSheetsClient("catalog");
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

  invalidateSheet(sheetName, "catalog");

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

  let allMeta: SheetMeta[];

  if (forceFresh) {
    allMeta = await getAllCatalogSheetMetaUncached();
  } else {
    const cacheKey = getMetaCacheKey(ttlSeconds);

    allMeta = await getOrSetCache<SheetMeta[]>(
      cacheKey,
      async () => getAllCatalogSheetMetaUncached(),
      ttlSeconds
    );
  }

  const sheet = allMeta.find((item) => item.title === sheetName);

  if (!sheet) {
    throw new Error(`Sheet metadata was not found for "${sheetName}".`);
  }

  return sheet;
}

export async function deleteSheetRowBySlug(sheetName: string, slug: string) {
  const rowNumber = await findRowNumberByField(sheetName, "slug", slug);

  if (!rowNumber) {
    throw new Error(`No record was found in "${sheetName}" for this slug.`);
  }

  const sheets = getSheetsClient("catalog");
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

  invalidateSheet(sheetName, "catalog");

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
    mode: "catalog",
  });

  if (!rows.length) {
    return { ok: true, deletedCount: 0 };
  }

  const headers = rowsToHeaders(rows);
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

  const sheets = getSheetsClient("catalog");
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

  invalidateSheet(sheetName, "catalog");

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
  const sheets = getSheetsClient("catalog");

  await withRetry(async () => {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: getSpreadsheetId("catalog"),
      range: `${sheetName}!A:ZZ`,
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

  invalidateSheet(sheetName, "catalog");

  return { ok: true };
}