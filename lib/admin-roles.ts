import {
  appendSheetRow,
  findRowNumberByField,
  findSheetItemByField,
  getSheetData,
  getSheetHeaders,
  updateSheetRowByRowNumber,
} from "./sheets";
import {
  DEFAULT_ROLE_PERMISSIONS,
  normalizePermissionList,
  permissionsToSheetValue,
} from "./admin-permissions";

const ADMIN_ROLES_SHEET = "admin_roles";

export type AdminRoleRecord = {
  id: string;
  role_key: string;
  name: string;
  permissions: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AdminRole = {
  id: string;
  roleKey: string;
  name: string;
  permissions: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRoleKey(value: unknown) {
  return normalizeLower(value)
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mapRole(row: Partial<AdminRoleRecord>): AdminRole {
  return {
    id: normalizeText(row.id),
    roleKey: normalizeRoleKey(row.role_key),
    name: normalizeText(row.name),
    permissions: normalizePermissionList(row.permissions),
    status: normalizeLower(row.status || "active") || "active",
    createdAt: normalizeText(row.created_at),
    updatedAt: normalizeText(row.updated_at),
  };
}

async function buildRowFromHeaders(record: Record<string, unknown>) {
  const headers = await getSheetHeaders(ADMIN_ROLES_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  });

  if (!headers.length) {
    throw new Error("admin_roles sheet headers could not be found.");
  }

  return headers.map((header) => {
    const value = record[header];
    return value == null ? "" : String(value);
  });
}

export async function getAdminRoles() {
  const rows = (await getSheetData(ADMIN_ROLES_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  })) as AdminRoleRecord[];

  return rows.map(mapRole).filter((role) => role.id && role.roleKey);
}

export async function getActiveAdminRoles() {
  const roles = await getAdminRoles();
  return roles.filter((role) => role.status === "active");
}

export async function findAdminRoleByKey(roleKey: string) {
  const normalizedRoleKey = normalizeRoleKey(roleKey);

  if (!normalizedRoleKey) {
    return null;
  }

  const row = (await findSheetItemByField(
    ADMIN_ROLES_SHEET,
    "role_key",
    normalizedRoleKey,
    { forceFresh: true, ttlSeconds: 0 }
  )) as AdminRoleRecord | null;

  return row ? mapRole(row) : null;
}

export async function getRolePermissions(roleKey: string) {
  const normalizedRoleKey = normalizeRoleKey(roleKey);

  const role = await findAdminRoleByKey(normalizedRoleKey);

  if (role && role.status === "active") {
    return role.permissions;
  }

  return DEFAULT_ROLE_PERMISSIONS[normalizedRoleKey] || [];
}

export async function createAdminRole(input: {
  roleKey: string;
  name: string;
  permissions: string[];
  status?: string;
}) {
  const roleKey = normalizeRoleKey(input.roleKey);
  const name = normalizeText(input.name);
  const status = normalizeLower(input.status || "active") || "active";

  if (!roleKey) {
    throw new Error("roleKey is required.");
  }

  if (!name) {
    throw new Error("name is required.");
  }

  const existing = await findAdminRoleByKey(roleKey);

  if (existing) {
    throw new Error("A role with this key already exists.");
  }

  const now = nowIso();

  const record: AdminRoleRecord = {
    id: createId("role"),
    role_key: roleKey,
    name,
    permissions: permissionsToSheetValue(input.permissions),
    status,
    created_at: now,
    updated_at: now,
  };

  const row = await buildRowFromHeaders(record);
  await appendSheetRow(ADMIN_ROLES_SHEET, row);

  return mapRole(record);
}

export async function updateAdminRole(
  roleId: string,
  input: {
    name?: string;
    permissions?: string[];
    status?: string;
  }
) {
  const normalizedRoleId = normalizeText(roleId);

  if (!normalizedRoleId) {
    throw new Error("roleId is required.");
  }

  const rowNumber = await findRowNumberByField(
    ADMIN_ROLES_SHEET,
    "id",
    normalizedRoleId
  );

  if (!rowNumber) {
    throw new Error("Role not found.");
  }

  const roles = await getAdminRoles();
  const current = roles.find((role) => role.id === normalizedRoleId);

  if (!current) {
    throw new Error("Role not found.");
  }

  const updatedRecord: AdminRoleRecord = {
    id: current.id,
    role_key: current.roleKey,
    name: normalizeText(input.name ?? current.name),
    permissions: permissionsToSheetValue(
      input.permissions ?? current.permissions
    ),
    status: normalizeLower(input.status ?? current.status) || "active",
    created_at: current.createdAt,
    updated_at: nowIso(),
  };

  const row = await buildRowFromHeaders(updatedRecord);
  await updateSheetRowByRowNumber(ADMIN_ROLES_SHEET, rowNumber, row);

  return mapRole(updatedRecord);
}