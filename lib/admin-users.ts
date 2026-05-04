import bcrypt from "bcryptjs";
import {
  appendSheetRow,
  findRowNumberByField,
  findSheetItemByField,
  getSheetData,
  getSheetHeaders,
  updateSheetRowByRowNumber,
} from "./sheets";
import { getRolePermissions } from "./admin-roles";

const ADMIN_USERS_SHEET = "admin_users";

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role_key: string;
  status: string;
  must_change_password: string;
  last_login_at: string;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  roleKey: string;
  status: string;
  mustChangePassword: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserWithPermissions = AdminUser & {
  permissions: string[];
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeBoolean(value: unknown) {
  return normalizeLower(value) === "true";
}

function booleanToSheetValue(value: boolean) {
  return value ? "true" : "false";
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function mapUser(row: Partial<AdminUserRecord>): AdminUser {
  return {
    id: normalizeText(row.id),
    email: normalizeLower(row.email),
    name: normalizeText(row.name),
    roleKey: normalizeLower(row.role_key || "viewer") || "viewer",
    status: normalizeLower(row.status || "active") || "active",
    mustChangePassword: normalizeBoolean(row.must_change_password),
    lastLoginAt: normalizeText(row.last_login_at),
    createdAt: normalizeText(row.created_at),
    updatedAt: normalizeText(row.updated_at),
  };
}

async function buildRowFromHeaders(record: Record<string, unknown>) {
  const headers = await getSheetHeaders(ADMIN_USERS_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  });

  if (!headers.length) {
    throw new Error("admin_users sheet headers could not be found.");
  }

  return headers.map((header) => {
    const value = record[header];
    return value == null ? "" : String(value);
  });
}

export async function hashAdminPassword(password: string) {
  const normalizedPassword = String(password || "");

  if (normalizedPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  return bcrypt.hash(normalizedPassword, 12);
}

export async function getAdminUsers() {
  const rows = (await getSheetData(ADMIN_USERS_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  })) as AdminUserRecord[];

  return rows.map(mapUser).filter((user) => user.id && user.email);
}

export async function findAdminUserByEmail(email: string) {
  const normalizedEmail = normalizeLower(email);

  if (!normalizedEmail) {
    return null;
  }

  const row = (await findSheetItemByField(
    ADMIN_USERS_SHEET,
    "email",
    normalizedEmail,
    { forceFresh: true, ttlSeconds: 0 }
  )) as AdminUserRecord | null;

  return row ? mapUser(row) : null;
}

export async function findAdminUserRecordByEmail(email: string) {
  const normalizedEmail = normalizeLower(email);

  if (!normalizedEmail) {
    return null;
  }

  return (await findSheetItemByField(
    ADMIN_USERS_SHEET,
    "email",
    normalizedEmail,
    { forceFresh: true, ttlSeconds: 0 }
  )) as AdminUserRecord | null;
}

export async function findAdminUserById(id: string) {
  const normalizedId = normalizeText(id);

  if (!normalizedId) {
    return null;
  }

  const row = (await findSheetItemByField(
    ADMIN_USERS_SHEET,
    "id",
    normalizedId,
    { forceFresh: true, ttlSeconds: 0 }
  )) as AdminUserRecord | null;

  return row ? mapUser(row) : null;
}

export async function getAdminUserWithPermissionsByEmail(email: string) {
  const user = await findAdminUserByEmail(email);

  if (!user) {
    return null;
  }

  const permissions = await getRolePermissions(user.roleKey);

  return {
    ...user,
    permissions,
  };
}

export async function createAdminUser(input: {
  email: string;
  name: string;
  password: string;
  roleKey: string;
  status?: string;
  mustChangePassword?: boolean;
}) {
  const email = normalizeLower(input.email);
  const name = normalizeText(input.name);
  const roleKey = normalizeLower(input.roleKey || "viewer") || "viewer";
  const status = normalizeLower(input.status || "active") || "active";

  if (!email) {
    throw new Error("email is required.");
  }

  if (!name) {
    throw new Error("name is required.");
  }

  const existing = await findAdminUserByEmail(email);

  if (existing) {
    throw new Error("An admin user with this email already exists.");
  }

  const passwordHash = await hashAdminPassword(input.password);
  const now = nowIso();

  const record: AdminUserRecord = {
    id: createId("admin"),
    email,
    name,
    password_hash: passwordHash,
    role_key: roleKey,
    status,
    must_change_password: booleanToSheetValue(
      input.mustChangePassword ?? true
    ),
    last_login_at: "",
    created_at: now,
    updated_at: now,
  };

  const row = await buildRowFromHeaders(record);
  await appendSheetRow(ADMIN_USERS_SHEET, row);

  return mapUser(record);
}

export async function updateAdminUser(
  userId: string,
  input: {
    name?: string;
    roleKey?: string;
    status?: string;
    mustChangePassword?: boolean;
  }
) {
  const normalizedUserId = normalizeText(userId);

  if (!normalizedUserId) {
    throw new Error("userId is required.");
  }

  const rowNumber = await findRowNumberByField(
    ADMIN_USERS_SHEET,
    "id",
    normalizedUserId
  );

  if (!rowNumber) {
    throw new Error("Admin user not found.");
  }

  const rows = (await getSheetData(ADMIN_USERS_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  })) as AdminUserRecord[];

  const currentRecord = rows.find(
    (row) => normalizeText(row.id) === normalizedUserId
  );

  if (!currentRecord) {
    throw new Error("Admin user not found.");
  }

  const updatedRecord: AdminUserRecord = {
    id: normalizeText(currentRecord.id),
    email: normalizeLower(currentRecord.email),
    name: normalizeText(input.name ?? currentRecord.name),
    password_hash: normalizeText(currentRecord.password_hash),
    role_key: normalizeLower(input.roleKey ?? currentRecord.role_key) || "viewer",
    status: normalizeLower(input.status ?? currentRecord.status) || "active",
    must_change_password: booleanToSheetValue(
      input.mustChangePassword ?? normalizeBoolean(currentRecord.must_change_password)
    ),
    last_login_at: normalizeText(currentRecord.last_login_at),
    created_at: normalizeText(currentRecord.created_at),
    updated_at: nowIso(),
  };

  const row = await buildRowFromHeaders(updatedRecord);
  await updateSheetRowByRowNumber(ADMIN_USERS_SHEET, rowNumber, row);

  return mapUser(updatedRecord);
}

export async function updateAdminUserPassword(
  userId: string,
  password: string,
  mustChangePassword = true
) {
  const normalizedUserId = normalizeText(userId);

  if (!normalizedUserId) {
    throw new Error("userId is required.");
  }

  const rowNumber = await findRowNumberByField(
    ADMIN_USERS_SHEET,
    "id",
    normalizedUserId
  );

  if (!rowNumber) {
    throw new Error("Admin user not found.");
  }

  const rows = (await getSheetData(ADMIN_USERS_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  })) as AdminUserRecord[];

  const currentRecord = rows.find(
    (row) => normalizeText(row.id) === normalizedUserId
  );

  if (!currentRecord) {
    throw new Error("Admin user not found.");
  }

  const updatedRecord: AdminUserRecord = {
    ...currentRecord,
    password_hash: await hashAdminPassword(password),
    must_change_password: booleanToSheetValue(mustChangePassword),
    updated_at: nowIso(),
  };

  const row = await buildRowFromHeaders(updatedRecord);
  await updateSheetRowByRowNumber(ADMIN_USERS_SHEET, rowNumber, row);

  return mapUser(updatedRecord);
}

export async function verifyAdminUserCredentials(email: string, password: string) {
  const normalizedEmail = normalizeLower(email);
  const normalizedPassword = String(password || "");

  if (!normalizedEmail || !normalizedPassword) {
    return null;
  }

  const record = await findAdminUserRecordByEmail(normalizedEmail);

  if (!record) {
    return null;
  }

  if (normalizeLower(record.status) !== "active") {
    return null;
  }

  const passwordHash = normalizeText(record.password_hash);

  if (!passwordHash) {
    return null;
  }

  const isValid = await bcrypt.compare(normalizedPassword, passwordHash);

  if (!isValid) {
    return null;
  }

  const user = mapUser(record);
  const permissions = await getRolePermissions(user.roleKey);

  return {
    ...user,
    permissions,
  };
}

export async function updateAdminUserLastLogin(userId: string) {
  const normalizedUserId = normalizeText(userId);

  if (!normalizedUserId) {
    return null;
  }

  const user = await findAdminUserById(normalizedUserId);

  if (!user) {
    return null;
  }

  return updateAdminUser(normalizedUserId, {
    name: user.name,
    roleKey: user.roleKey,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
  });
}