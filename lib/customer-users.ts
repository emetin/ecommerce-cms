import {
  appendSheetRow,
  getSheetRows,
  updateSheetRowByRowNumber,
} from "./sheets";

const CUSTOMERS_SHEET_NAME = "customers";
const CUSTOMER_PASSWORD_RESETS_SHEET_NAME = "customer_password_resets";

type GenericSheetRow = Record<string, unknown> & {
  __rowNumber?: number;
};

function normalize(value: unknown) {
  return String(value || "").trim();
}

export type CustomerRow = {
  rowNumber: number;
  id?: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type CustomerPasswordResetRow = {
  rowNumber: number;
  email: string;
  token_hash: string;
  expires_at: string;
  used: string;
  created_at: string;
};

export async function findCustomerByEmail(email: string) {
  const rows = (await getSheetRows(
    CUSTOMERS_SHEET_NAME
  )) as unknown as GenericSheetRow[];

  const normalizedEmail = email.toLowerCase();

  for (const row of rows) {
    const rowEmail = normalize(row.email).toLowerCase();

    if (rowEmail === normalizedEmail && row.__rowNumber) {
      return {
        rowNumber: row.__rowNumber,
        id: normalize(row.id),
        email: rowEmail,
        password_hash: normalize(row.password_hash),
        first_name: normalize(row.first_name),
        last_name: normalize(row.last_name),
        status: normalize(row.status),
        created_at: normalize(row.created_at),
        updated_at: normalize(row.updated_at),
      } satisfies CustomerRow;
    }
  }

  return null;
}

export async function saveCustomerPasswordResetToken(params: {
  email: string;
  token_hash: string;
  expires_at: string;
  used: string;
  created_at: string;
}) {
  await appendSheetRow(CUSTOMER_PASSWORD_RESETS_SHEET_NAME, [
    params.email,
    params.token_hash,
    params.expires_at,
    params.used,
    params.created_at,
  ]);
}

export async function invalidateActiveResetTokensForEmail(email: string) {
  const rows = (await getSheetRows(
    CUSTOMER_PASSWORD_RESETS_SHEET_NAME
  )) as unknown as GenericSheetRow[];

  const normalizedEmail = email.toLowerCase();

  for (const row of rows) {
    const rowEmail = normalize(row.email).toLowerCase();
    const rowUsed = normalize(row.used).toLowerCase();

    if (rowEmail === normalizedEmail && rowUsed !== "true" && row.__rowNumber) {
      await updateSheetRowByRowNumber(
        CUSTOMER_PASSWORD_RESETS_SHEET_NAME,
        row.__rowNumber,
        [
          normalize(row.email),
          normalize(row.token_hash),
          normalize(row.expires_at),
          "true",
          normalize(row.created_at),
        ]
      );
    }
  }
}

export async function findLatestResetTokenByEmail(email: string) {
  const rows = (await getSheetRows(
    CUSTOMER_PASSWORD_RESETS_SHEET_NAME
  )) as unknown as GenericSheetRow[];

  const normalizedEmail = email.toLowerCase();

  const matches = rows
    .filter((row) => normalize(row.email).toLowerCase() === normalizedEmail)
    .map((row) => ({
      rowNumber: Number(row.__rowNumber || 0),
      email: normalize(row.email),
      token_hash: normalize(row.token_hash),
      expires_at: normalize(row.expires_at),
      used: normalize(row.used),
      created_at: normalize(row.created_at),
    }))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return (matches[0] || null) as CustomerPasswordResetRow | null;
}

export async function markResetTokenUsed(email: string, createdAt: string) {
  const rows = (await getSheetRows(
    CUSTOMER_PASSWORD_RESETS_SHEET_NAME
  )) as unknown as GenericSheetRow[];

  const normalizedEmail = email.toLowerCase();

  for (const row of rows) {
    const rowEmail = normalize(row.email).toLowerCase();
    const rowCreatedAt = normalize(row.created_at);

    if (
      rowEmail === normalizedEmail &&
      rowCreatedAt === createdAt &&
      row.__rowNumber
    ) {
      await updateSheetRowByRowNumber(
        CUSTOMER_PASSWORD_RESETS_SHEET_NAME,
        row.__rowNumber,
        [
          normalize(row.email),
          normalize(row.token_hash),
          normalize(row.expires_at),
          "true",
          normalize(row.created_at),
        ]
      );
      return;
    }
  }
}

export async function updateCustomerPasswordHashByEmail(
  email: string,
  newPasswordHash: string
) {
  const rows = (await getSheetRows(
    CUSTOMERS_SHEET_NAME
  )) as unknown as GenericSheetRow[];

  const normalizedEmail = email.toLowerCase();

  for (const row of rows) {
    const rowEmail = normalize(row.email).toLowerCase();

    if (rowEmail === normalizedEmail && row.__rowNumber) {
      await updateSheetRowByRowNumber(CUSTOMERS_SHEET_NAME, row.__rowNumber, [
        normalize(row.id),
        rowEmail,
        newPasswordHash,
        normalize(row.first_name),
        normalize(row.last_name),
        normalize(row.status),
        normalize(row.created_at),
        new Date().toISOString(),
      ]);
      return;
    }
  }

  throw new Error("Customer not found.");
}