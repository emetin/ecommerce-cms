import { google } from "googleapis";

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!GOOGLE_SHEET_ID) {
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

function columnNumberToLetter(column: number) {
  let temp = column;
  let letter = "";

  while (temp > 0) {
    const remainder = (temp - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    temp = Math.floor((temp - remainder - 1) / 26);
  }

  return letter;
}

async function getSheetMatrix(sheetName: string) {
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${sheetName}!A:ZZ`,
  });

  return response.data.values || [];
}

export async function updateSheetRowById(
  sheetName: string,
  id: string,
  rowValues: string[]
) {
  const matrix = await getSheetMatrix(sheetName);

  if (!matrix.length) {
    throw new Error(`Sheet "${sheetName}" is empty.`);
  }

  const headers = matrix[0];
  const idColumnIndex = headers.findIndex(
    (header) => String(header || "").trim() === "id"
  );

  if (idColumnIndex === -1) {
    throw new Error(`Sheet "${sheetName}" does not contain an "id" column.`);
  }

  const dataRows = matrix.slice(1);
  const rowIndexInData = dataRows.findIndex(
    (row) => String(row[idColumnIndex] || "").trim() === String(id || "").trim()
  );

  if (rowIndexInData === -1) {
    throw new Error(`Row with id "${id}" was not found in "${sheetName}".`);
  }

  const actualRowNumber = rowIndexInData + 2;
  const lastColumnLetter = columnNumberToLetter(headers.length || rowValues.length);

  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${sheetName}!A${actualRowNumber}:${lastColumnLetter}${actualRowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [rowValues],
    },
  });
}

export async function deleteSheetRowById(sheetName: string, id: string) {
  const sheets = getSheetsClient();

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: GOOGLE_SHEET_ID,
  });

  const targetSheet = spreadsheet.data.sheets?.find(
    (sheet) => sheet.properties?.title === sheetName
  );

  if (!targetSheet?.properties?.sheetId && targetSheet?.properties?.sheetId !== 0) {
    throw new Error(`Sheet "${sheetName}" not found.`);
  }

  const sheetId = targetSheet.properties.sheetId;
  const matrix = await getSheetMatrix(sheetName);

  if (!matrix.length) {
    throw new Error(`Sheet "${sheetName}" is empty.`);
  }

  const headers = matrix[0];
  const idColumnIndex = headers.findIndex(
    (header) => String(header || "").trim() === "id"
  );

  if (idColumnIndex === -1) {
    throw new Error(`Sheet "${sheetName}" does not contain an "id" column.`);
  }

  const dataRows = matrix.slice(1);
  const rowIndexInData = dataRows.findIndex(
    (row) => String(row[idColumnIndex] || "").trim() === String(id || "").trim()
  );

  if (rowIndexInData === -1) {
    throw new Error(`Row with id "${id}" was not found in "${sheetName}".`);
  }

  const zeroBasedRowIndexIncludingHeader = rowIndexInData + 1;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: GOOGLE_SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: zeroBasedRowIndexIncludingHeader,
              endIndex: zeroBasedRowIndexIncludingHeader + 1,
            },
          },
        },
      ],
    },
  });
}