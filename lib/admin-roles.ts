import { createSupabaseAdminClient } from "./supabase/admin";
import {
  DEFAULT_ROLE_PERMISSIONS,
  normalizePermissionList,
} from "./admin-permissions";

export type AdminRoleRecord = {
  id: string;
  role_key: string;
  name: string;
  permissions_json: unknown;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
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

function normalizeRoleKey(value: unknown) {
  return normalizeLower(value)
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeStatus(value: unknown) {
  const status = normalizeLower(value || "active") || "active";

  if (["active", "inactive", "archived"].includes(status)) {
    return status;
  }

  return "active";
}

function nowIso() {
  return new Date().toISOString();
}

function normalizePermissions(value: unknown) {
  if (Array.isArray(value)) {
    return normalizePermissionList(value);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizePermissionList(parsed);
    } catch {
      return normalizePermissionList(value);
    }
  }

  return normalizePermissionList(value);
}

function mapRole(row: Partial<AdminRoleRecord>): AdminRole {
  const roleKey = normalizeRoleKey(row.role_key);
  const permissions = normalizePermissions(row.permissions_json);

  return {
    id: normalizeText(row.id),
    roleKey,
    name: normalizeText(row.name),
    permissions:
      permissions.length > 0
        ? permissions
        : DEFAULT_ROLE_PERMISSIONS[roleKey] || [],
    status: normalizeStatus(row.status),
    createdAt: normalizeText(row.created_at),
    updatedAt: normalizeText(row.updated_at),
  };
}

export async function getAdminRoles() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_roles")
    .select(
      `
      id,
      role_key,
      name,
      permissions_json,
      status,
      created_at,
      updated_at
    `
    )
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as AdminRoleRecord[])
    .map(mapRole)
    .filter((role) => role.id && role.roleKey);
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

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_roles")
    .select(
      `
      id,
      role_key,
      name,
      permissions_json,
      status,
      created_at,
      updated_at
    `
    )
    .eq("role_key", normalizedRoleKey)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRole(data as AdminRoleRecord) : null;
}

export async function getRolePermissions(roleKey: string) {
  const normalizedRoleKey = normalizeRoleKey(roleKey);

  if (!normalizedRoleKey) {
    return [];
  }

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
  const status = normalizeStatus(input.status);
  const permissions = normalizePermissionList(input.permissions);

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

  const supabase = createSupabaseAdminClient();
  const now = nowIso();

  const { data, error } = await supabase
    .from("admin_roles")
    .insert({
      role_key: roleKey,
      name,
      permissions_json: permissions,
      status,
      created_at: now,
      updated_at: now,
    })
    .select(
      `
      id,
      role_key,
      name,
      permissions_json,
      status,
      created_at,
      updated_at
    `
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRole(data as AdminRoleRecord);
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

  const updatePayload: Record<string, unknown> = {
    updated_at: nowIso(),
  };

  if (input.name !== undefined) {
    const name = normalizeText(input.name);

    if (!name) {
      throw new Error("name is required.");
    }

    updatePayload.name = name;
  }

  if (input.permissions !== undefined) {
    updatePayload.permissions_json = normalizePermissionList(input.permissions);
  }

  if (input.status !== undefined) {
    updatePayload.status = normalizeStatus(input.status);
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_roles")
    .update(updatePayload)
    .eq("id", normalizedRoleId)
    .select(
      `
      id,
      role_key,
      name,
      permissions_json,
      status,
      created_at,
      updated_at
    `
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Role not found.");
  }

  return mapRole(data as AdminRoleRecord);
}