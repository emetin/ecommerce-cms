import bcrypt from "bcryptjs";
import { createSupabaseAdminClient } from "./supabase/admin";
import { getRolePermissions } from "./admin-roles";

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string | null;
  full_name?: string | null;
  password_hash: string;
  role_key: string | null;
  role?: string | null;
  status: string | null;
  must_change_password: boolean | null;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
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

function normalizeStatus(value: unknown) {
  const status = normalizeLower(value || "active") || "active";

  if (["active", "inactive", "archived"].includes(status)) {
    return status;
  }

  return "active";
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeLower(value);

  if (normalized === "true") return true;
  if (normalized === "false") return false;

  return false;
}

function nowIso() {
  return new Date().toISOString();
}

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

function mapUser(row: Partial<AdminUserRecord>): AdminUser {
  return {
    id: normalizeText(row.id),
    email: normalizeLower(row.email),
    name:
      normalizeText(row.name) ||
      normalizeText(row.full_name) ||
      normalizeLower(row.email) ||
      "Admin User",
    roleKey:
      normalizeLower(row.role_key) ||
      normalizeLower(row.role) ||
      "viewer",
    status: normalizeStatus(row.status),
    mustChangePassword: normalizeBoolean(row.must_change_password),
    lastLoginAt: normalizeText(row.last_login_at),
    createdAt: normalizeText(row.created_at),
    updatedAt: normalizeText(row.updated_at),
  };
}

async function mapUserWithPermissions(
  row: Partial<AdminUserRecord>
): Promise<AdminUserWithPermissions> {
  const user = mapUser(row);
  const permissions = await getRolePermissions(user.roleKey);

  return {
    ...user,
    permissions,
  };
}

export async function hashAdminPassword(password: string) {
  const normalizedPassword = String(password || "");

  if (normalizedPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  return bcrypt.hash(normalizedPassword, 12);
}

export async function getAdminUsers() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_users")
    .select(
      `
      id,
      email,
      name,
      full_name,
      password_hash,
      role_key,
      role,
      status,
      must_change_password,
      last_login_at,
      created_at,
      updated_at
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as AdminUserRecord[])
    .map(mapUser)
    .filter((user) => user.id && user.email);
}

export async function findAdminUserByEmail(email: string) {
  const normalizedEmail = normalizeLower(email);

  if (!normalizedEmail) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_users")
    .select(
      `
      id,
      email,
      name,
      full_name,
      password_hash,
      role_key,
      role,
      status,
      must_change_password,
      last_login_at,
      created_at,
      updated_at
    `
    )
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapUser(data as AdminUserRecord) : null;
}

export async function findAdminUserRecordByEmail(email: string) {
  const normalizedEmail = normalizeLower(email);

  if (!normalizedEmail) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_users")
    .select(
      `
      id,
      email,
      name,
      full_name,
      password_hash,
      role_key,
      role,
      status,
      must_change_password,
      last_login_at,
      created_at,
      updated_at
    `
    )
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as AdminUserRecord | null;
}

export async function findAdminUserById(id: string) {
  const normalizedId = normalizeText(id);

  if (!normalizedId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_users")
    .select(
      `
      id,
      email,
      name,
      full_name,
      password_hash,
      role_key,
      role,
      status,
      must_change_password,
      last_login_at,
      created_at,
      updated_at
    `
    )
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapUser(data as AdminUserRecord) : null;
}

export async function getAdminUserWithPermissionsByEmail(email: string) {
  const record = await findAdminUserRecordByEmail(email);

  if (!record) {
    return null;
  }

  return mapUserWithPermissions(record);
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
  const status = normalizeStatus(input.status);

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

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      email,
      name,
      full_name: name,
      password_hash: passwordHash,
      role_key: roleKey,
      role: roleKey,
      status,
      must_change_password: input.mustChangePassword ?? true,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    })
    .select(
      `
      id,
      email,
      name,
      full_name,
      password_hash,
      role_key,
      role,
      status,
      must_change_password,
      last_login_at,
      created_at,
      updated_at
    `
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapUser(data as AdminUserRecord);
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

  const updatePayload: Record<string, unknown> = {
    updated_at: nowIso(),
  };

  if (input.name !== undefined) {
    const name = normalizeText(input.name);

    if (!name) {
      throw new Error("name is required.");
    }

    updatePayload.name = name;
    updatePayload.full_name = name;
  }

  if (input.roleKey !== undefined) {
    const roleKey = normalizeLower(input.roleKey || "viewer") || "viewer";
    updatePayload.role_key = roleKey;
    updatePayload.role = roleKey;
  }

  if (input.status !== undefined) {
    updatePayload.status = normalizeStatus(input.status);
  }

  if (input.mustChangePassword !== undefined) {
    updatePayload.must_change_password = Boolean(input.mustChangePassword);
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_users")
    .update(updatePayload)
    .eq("id", normalizedUserId)
    .select(
      `
      id,
      email,
      name,
      full_name,
      password_hash,
      role_key,
      role,
      status,
      must_change_password,
      last_login_at,
      created_at,
      updated_at
    `
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Admin user not found.");
  }

  return mapUser(data as AdminUserRecord);
}

export async function updateAdminUserPassword(
  userId: string,
  password: string,
  mustChangePassword = false
) {
  const normalizedUserId = normalizeText(userId);

  if (!normalizedUserId) {
    throw new Error("userId is required.");
  }

  const passwordHash = await hashAdminPassword(password);
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_users")
    .update({
      password_hash: passwordHash,
      must_change_password: mustChangePassword,
      updated_at: nowIso(),
    })
    .eq("id", normalizedUserId)
    .select(
      `
      id,
      email,
      name,
      full_name,
      password_hash,
      role_key,
      role,
      status,
      must_change_password,
      last_login_at,
      created_at,
      updated_at
    `
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Admin user not found.");
  }

  return mapUser(data as AdminUserRecord);
}

async function verifyPasswordAgainstHash(password: string, passwordHash: string) {
  const normalizedPassword = String(password || "");
  const normalizedHash = normalizeText(passwordHash);

  if (!normalizedPassword || !normalizedHash) {
    return false;
  }

  if (!isBcryptHash(normalizedHash)) {
    console.error(
      "Invalid admin password hash format. The password_hash field must contain a bcrypt hash."
    );

    return false;
  }

  return bcrypt.compare(normalizedPassword, normalizedHash);
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

  if (normalizeStatus(record.status) !== "active") {
    return null;
  }

  const passwordHash = normalizeText(record.password_hash);

  const isValid = await verifyPasswordAgainstHash(
    normalizedPassword,
    passwordHash
  );

  if (!isValid) {
    return null;
  }

  return mapUserWithPermissions(record);
}

export async function updateAdminUserLastLogin(userId: string) {
  const normalizedUserId = normalizeText(userId);

  if (!normalizedUserId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_users")
    .update({
      last_login_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", normalizedUserId)
    .select(
      `
      id,
      email,
      name,
      full_name,
      password_hash,
      role_key,
      role,
      status,
      must_change_password,
      last_login_at,
      created_at,
      updated_at
    `
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapUser(data as AdminUserRecord) : null;
}

export async function deleteAdminUser(userId: string) {
  const normalizedUserId = normalizeText(userId);

  if (!normalizedUserId) {
    throw new Error("userId is required.");
  }

  const existing = await findAdminUserById(normalizedUserId);

  if (!existing) {
    throw new Error("Admin user not found.");
  }

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("admin_users")
    .delete()
    .eq("id", normalizedUserId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}