import { google } from "googleapis";
import {
  deleteCache,
  deleteCacheByPrefix,
  getCache,
  setCache,
} from "../lib/cache";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const FORMS_SHEET_ID = process.env.GOOGLE_FORMS_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const DEFAULT_TTL_SECONDS = 300;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY_MS = 500;

if (!SHEET_ID) {
  throw new Error("Missing GOOGLE_SHEET_ID.");
}

if (!CLIENT_EMAIL) {
  throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL.");
}

if (!PRIVATE_KEY) {
  throw new Error("Missing GOOGLE_PRIVATE_KEY.");
}

function getAuth() {
  return new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  const auth = getAuth();

  return google.sheets({
    version: "v4",
    auth,
  });
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

function getRowsCacheKey(sheetName: string) {
  return `sheet:rows:${sheetName}`;
}

function getHeadersCacheKey(sheetName: string) {
  return `sheet:headers:${sheetName}`;
}

function getObjectsCacheKey(sheetName: string) {
  return `sheet:objects:${sheetName}`;
}

function getMetaCacheKey(sheetName: string) {
  return `sheet:meta:${sheetName}`;
}

function clearSheetCache(sheetName: string) {
  deleteCache(getRowsCacheKey(sheetName));
  deleteCache(getHeadersCacheKey(sheetName));
  deleteCache(getObjectsCacheKey(sheetName));
  deleteCache(getMetaCacheKey(sheetName));
  deleteCacheByPrefix(`sheet:${sheetName}:`);
}

export async function getSheetRows(
  sheetName: string,
  options?: { forceFresh?: boolean; ttlSeconds?: number }
) {
  const forceFresh = options?.forceFresh ?? false;
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const cacheKey = getRowsCacheKey(sheetName);

  if (!forceFresh) {
    const cached = getCache<string[][]>(cacheKey);

    if (cached) {
      return cached;
    }
  }

  const sheets = getSheetsClient();

  const rows = await withRetry(async () => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId("catalog"),
      range: `${sheetName}!A:ZZ`,
    });

    return (response.data.values || []) as string[][];
  });

  setCache(cacheKey, rows, ttlSeconds);

  return rows;
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
  const cacheKey = getObjectsCacheKey(sheetName);

  if (!forceFresh) {
    const cached = getCache<Record<string, string>[]>(cacheKey);

    if (cached) {
      return cached;
    }
  }

  const rows = await getSheetRows(sheetName, {
    forceFresh,
    ttlSeconds,
  });

  const data = rowsToObjects(rows);

  setCache(cacheKey, data, ttlSeconds);

  return data;
}

export async function appendSheetRow(sheetName: string, row: string[]) {
  const sheets = getSheetsClient();

  await withRetry(async () => {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId("catalog"),
      range: `${sheetName}!A:ZZ`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });
  });

  clearSheetCache(sheetName);

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
      range: `${sheetName}!A:ZZ`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    });
  });

  clearSheetCache(sheetName);

  return { ok: true };
}

export async function appendFormSheetRow(sheetName: string, row: string[]) {
  const sheets = getSheetsClient();

  await withRetry(async () => {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId("forms"),
      range: `${sheetName}!A:ZZ`,
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
      range: `${sheetName}!A:ZZ`,
    });

    return (response.data.values || []) as string[][];
  });

  return rowsToObjects(rows);
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

export async function getSheetHeaders(
  sheetName: string,
  options?: { forceFresh?: boolean; ttlSeconds?: number }
) {
  const forceFresh = options?.forceFresh ?? false;
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const cacheKey = getHeadersCacheKey(sheetName);

  if (!forceFresh) {
    const cached = getCache<string[]>(cacheKey);

    if (cached) {
      return cached;
    }
  }

  const rows = await getSheetRows(sheetName, {
    forceFresh,
    ttlSeconds,
  });

  const headers = rows[0]?.map((item) => String(item).trim()) || [];

  setCache(cacheKey, headers, ttlSeconds);

  return headers;
}

export async function findRowNumberByField(
  sheetName: string,
  fieldName: string,
  fieldValue: string
) {
  const rows = await getSheetRows(sheetName);

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
  const rows = await getSheetRows(sheetName);

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

  clearSheetCache(sheetName);

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
  const cacheKey = getMetaCacheKey(sheetName);

  if (!forceFresh) {
    const cached = getCache<{ sheetId: number; title: string }>(cacheKey);

    if (cached) {
      return cached;
    }
  }

  const sheets = getSheetsClient();

  const meta = await withRetry(async () => {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: getSpreadsheetId("catalog"),
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
  });

  setCache(cacheKey, meta, ttlSeconds);

  return meta;
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

  clearSheetCache(sheetName);

  return { ok: true };
}

export async function findAllRowsByField(
  sheetName: string,
  fieldName: string,
  fieldValue: string
) {
  const rows = await getSheetRows(sheetName);

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((header) => String(header).trim());
  const fieldIndex = headers.findIndex((header) => header === fieldName);

  if (fieldIndex === -1) {
    throw new Error(`Field "${fieldName}" was not found in "${sheetName}".`);
  }

  const normalizedValue = String(fieldValue).trim().toLowerCase();
  const matches: Array<{ rowNumber: number; row: string[] }> = [];

  for (let i = 1; i < rows.length; i += 1) {
    const rowValue = String(rows[i]?.[fieldIndex] || "")
      .trim()
      .toLowerCase();

    if (rowValue === normalizedValue) {
      matches.push({
        rowNumber: i + 1,
        row: rows[i],
      });
    }
  }

  return matches;
}

export async function deleteSheetRowsByField(
  sheetName: string,
  fieldName: string,
  fieldValue: string
) {
  const rows = await findAllRowsByField(sheetName, fieldName, fieldValue);

  if (!rows.length) {
    return { ok: true, deleted: 0 };
  }

  const sheets = getSheetsClient();
  const meta = await getSheetMetaByTitle(sheetName);

  const sorted = [...rows].sort((a, b) => b.rowNumber - a.rowNumber);

  await withRetry(async () => {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId("catalog"),
      requestBody: {
        requests: sorted.map((item) => ({
          deleteDimension: {
            range: {
              sheetId: meta.sheetId,
              dimension: "ROWS",
              startIndex: item.rowNumber - 1,
              endIndex: item.rowNumber,
            },
          },
        })),
      },
    });
  });

  clearSheetCache(sheetName);

  return { ok: true, deleted: rows.length };
}