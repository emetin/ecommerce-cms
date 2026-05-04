"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type AdminUser = {
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

type AdminRole = {
  id: string;
  roleKey: string;
  name: string;
  permissions: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

type UsersResponse = {
  ok: boolean;
  error?: string;
  items?: AdminUser[];
};

type RolesResponse = {
  ok: boolean;
  error?: string;
  items?: AdminRole[];
};

const STATUS_OPTIONS = ["active", "inactive"];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusStyle(status: string): CSSProperties {
  const normalized = normalizeLower(status);

  if (normalized === "active") {
    return {
      background: "#eef8f0",
      color: "#2f7d62",
      border: "1px solid rgba(47,125,98,0.18)",
    };
  }

  return {
    background: "#fff4f2",
    color: "#a54a3f",
    border: "1px solid rgba(165,74,63,0.18)",
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState("");
  const [passwordUserId, setPasswordUserId] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    password: "",
    roleKey: "viewer",
    status: "active",
    mustChangePassword: true,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    roleKey: "viewer",
    status: "active",
    mustChangePassword: false,
  });

  const [passwordForm, setPasswordForm] = useState({
    password: "",
    mustChangePassword: true,
  });

  async function loadUsers() {
    const response = await fetch("/api/admin/users", {
      cache: "no-store",
    });

    const data = (await response.json()) as UsersResponse;

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to load admin users.");
    }

    setUsers(Array.isArray(data.items) ? data.items : []);
  }

  async function loadRoles() {
    const response = await fetch("/api/admin/roles", {
      cache: "no-store",
    });

    const data = (await response.json()) as RolesResponse;

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to load admin roles.");
    }

    const nextRoles = Array.isArray(data.items) ? data.items : [];
    setRoles(nextRoles);

    const firstActiveRole =
      nextRoles.find((role) => role.status === "active")?.roleKey || "viewer";

    setNewUser((prev) => ({
      ...prev,
      roleKey: prev.roleKey || firstActiveRole,
    }));
  }

  async function loadPageData() {
    try {
      setLoading(true);
      setErrorMessage("");
      await Promise.all([loadUsers(), loadRoles()]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown loading error."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  const activeRoles = useMemo(() => {
    return roles.filter((role) => role.status === "active");
  }, [roles]);

  const roleNameMap = useMemo(() => {
    return roles.reduce<Record<string, string>>((acc, role) => {
      acc[role.roleKey] = role.name;
      return acc;
    }, {});
  }, [roles]);

  const filteredUsers = useMemo(() => {
    const query = normalizeLower(searchInput);

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        normalizeLower(user.name).includes(query) ||
        normalizeLower(user.email).includes(query) ||
        normalizeLower(user.roleKey).includes(query);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : normalizeLower(user.status) === normalizeLower(statusFilter);

      const matchesRole =
        roleFilter === "all"
          ? true
          : normalizeLower(user.roleKey) === normalizeLower(roleFilter);

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchInput, statusFilter, roleFilter]);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.status === "active").length;
    const inactive = users.filter((user) => user.status === "inactive").length;
    const mustChangePassword = users.filter(
      (user) => user.mustChangePassword
    ).length;

    return {
      total: users.length,
      active,
      inactive,
      roles: roles.length,
      mustChangePassword,
    };
  }, [users, roles]);

  function openEdit(user: AdminUser) {
    setEditingId(user.id);
    setPasswordUserId("");
    setEditForm({
      name: user.name,
      roleKey: user.roleKey || "viewer",
      status: user.status || "active",
      mustChangePassword: Boolean(user.mustChangePassword),
    });
    setSuccessMessage("");
    setErrorMessage("");
  }

  function closeEdit() {
    setEditingId("");
  }

  function openPassword(user: AdminUser) {
    setPasswordUserId(user.id);
    setEditingId("");
    setPasswordForm({
      password: "",
      mustChangePassword: true,
    });
    setSuccessMessage("");
    setErrorMessage("");
  }

  function closePassword() {
    setPasswordUserId("");
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to create admin user.");
      }

      setSuccessMessage("Admin user created successfully.");
      setNewUser({
        email: "",
        name: "",
        password: "",
        roleKey: activeRoles[0]?.roleKey || "viewer",
        status: "active",
        mustChangePassword: true,
      });

      await loadUsers();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown create error."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateUser(userId: string) {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editForm),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to update admin user.");
      }

      setSuccessMessage("Admin user updated successfully.");
      setEditingId("");
      await loadUsers();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown update error."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(userId: string) {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}/password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(passwordForm),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setSuccessMessage("Password updated successfully.");
      setPasswordUserId("");
      setPasswordForm({
        password: "",
        mustChangePassword: true,
      });

      await loadUsers();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown password error."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={loadingCardStyle}>Loading users and roles...</div>;
  }

  return (
    <div style={pageStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Users & Roles</h1>
          <p style={subtitleStyle}>
            Manage admin users, role assignments, access status, and password
            resets.
          </p>
        </div>

        <Link href="/admin/roles" style={roleSettingsButtonStyle}>
          Role Settings
        </Link>
      </div>

      {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}
      {successMessage ? (
        <div style={successBoxStyle}>{successMessage}</div>
      ) : null}

      <section style={statsGridStyle}>
        <StatCard label="Users" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Roles" value={stats.roles} />
        <StatCard
          label="Password Change"
          value={stats.mustChangePassword}
          warning
        />
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <div style={eyebrowStyle}>Create</div>
            <h2 style={sectionTitleStyle}>New Admin User</h2>
          </div>
        </div>

        <form onSubmit={handleCreateUser} style={createGridStyle}>
          <Field label="Name">
            <input
              value={newUser.name}
              onChange={(event) =>
                setNewUser((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Full name"
              style={inputStyle}
            />
          </Field>

          <Field label="Email">
            <input
              value={newUser.email}
              onChange={(event) =>
                setNewUser((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="admin@example.com"
              type="email"
              style={inputStyle}
            />
          </Field>

          <Field label="Temporary Password">
            <input
              value={newUser.password}
              onChange={(event) =>
                setNewUser((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              placeholder="At least 8 characters"
              type="password"
              style={inputStyle}
            />
          </Field>

          <Field label="Role">
            <select
              value={newUser.roleKey}
              onChange={(event) =>
                setNewUser((prev) => ({
                  ...prev,
                  roleKey: event.target.value,
                }))
              }
              style={inputStyle}
            >
              {activeRoles.map((role) => (
                <option key={role.id} value={role.roleKey}>
                  {role.name} ({role.roleKey})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              value={newUser.status}
              onChange={(event) =>
                setNewUser((prev) => ({
                  ...prev,
                  status: event.target.value,
                }))
              }
              style={inputStyle}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <label style={checkboxWrapStyle}>
            <input
              type="checkbox"
              checked={newUser.mustChangePassword}
              onChange={(event) =>
                setNewUser((prev) => ({
                  ...prev,
                  mustChangePassword: event.target.checked,
                }))
              }
            />
            <span>Require password change</span>
          </label>

          <button type="submit" disabled={saving} style={primaryButtonStyle}>
            {saving ? "Creating..." : "Create User"}
          </button>
        </form>
      </section>

      <section style={panelStyle}>
        <div style={listHeaderStyle}>
          <div>
            <div style={eyebrowStyle}>Manage</div>
            <h2 style={sectionTitleStyle}>Admin Users</h2>
          </div>
        </div>

        <div style={filterGridStyle}>
          <Field label="Search">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, email, or role"
              style={inputStyle}
            />
          </Field>

          <Field label="Status">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={inputStyle}
            >
              <option value="all">all</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Role">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              style={inputStyle}
            >
              <option value="all">all</option>
              {roles.map((role) => (
                <option key={role.id} value={role.roleKey}>
                  {role.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={usersListStyle}>
          {filteredUsers.length === 0 ? (
            <div style={emptyStyle}>No admin users matched your filters.</div>
          ) : (
            filteredUsers.map((user) => {
              const isEditing = editingId === user.id;
              const isPasswordOpen = passwordUserId === user.id;

              return (
                <div key={user.id} style={userCardStyle}>
                  <div style={userTopStyle}>
                    <div>
                      <div style={userNameStyle}>{user.name || "-"}</div>
                      <div style={userEmailStyle}>{user.email || "-"}</div>
                    </div>

                    <div style={topActionsStyle}>
                      <span
                        style={{
                          ...statusPillStyle,
                          ...getStatusStyle(user.status),
                        }}
                      >
                        {user.status || "inactive"}
                      </span>

                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        style={secondaryButtonStyle}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openPassword(user)}
                        style={secondaryButtonStyle}
                      >
                        Password
                      </button>
                    </div>
                  </div>

                  <div style={metaGridStyle}>
                    <Meta
                      label="Role"
                      value={roleNameMap[user.roleKey] || user.roleKey}
                    />
                    <Meta
                      label="Password Change"
                      value={user.mustChangePassword ? "Required" : "No"}
                    />
                    <Meta
                      label="Last Login"
                      value={formatDate(user.lastLoginAt)}
                    />
                    <Meta label="Updated" value={formatDate(user.updatedAt)} />
                  </div>

                  {isEditing ? (
                    <div style={editPanelStyle}>
                      <div style={editHeaderStyle}>
                        <div>
                          <div style={eyebrowStyle}>Edit</div>
                          <h3 style={editTitleStyle}>{user.name}</h3>
                        </div>
                      </div>

                      <div style={editGridStyle}>
                        <Field label="Name">
                          <input
                            value={editForm.name}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                name: event.target.value,
                              }))
                            }
                            style={inputStyle}
                          />
                        </Field>

                        <Field label="Role">
                          <select
                            value={editForm.roleKey}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                roleKey: event.target.value,
                              }))
                            }
                            style={inputStyle}
                          >
                            {activeRoles.map((role) => (
                              <option key={role.id} value={role.roleKey}>
                                {role.name} ({role.roleKey})
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Status">
                          <select
                            value={editForm.status}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                status: event.target.value,
                              }))
                            }
                            style={inputStyle}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <label style={checkboxWrapStyle}>
                          <input
                            type="checkbox"
                            checked={editForm.mustChangePassword}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                mustChangePassword: event.target.checked,
                              }))
                            }
                          />
                          <span>Require password change</span>
                        </label>
                      </div>

                      <div style={actionsStyle}>
                        <button
                          type="button"
                          onClick={() => handleUpdateUser(user.id)}
                          disabled={saving}
                          style={primaryButtonStyle}
                        >
                          {saving ? "Saving..." : "Save User"}
                        </button>

                        <button
                          type="button"
                          onClick={closeEdit}
                          style={secondaryButtonStyle}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {isPasswordOpen ? (
                    <div style={editPanelStyle}>
                      <div style={editHeaderStyle}>
                        <div>
                          <div style={eyebrowStyle}>Security</div>
                          <h3 style={editTitleStyle}>Reset Password</h3>
                        </div>
                      </div>

                      <div style={editGridStyle}>
                        <Field label="New Password">
                          <input
                            value={passwordForm.password}
                            onChange={(event) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                password: event.target.value,
                              }))
                            }
                            placeholder="At least 8 characters"
                            type="password"
                            style={inputStyle}
                          />
                        </Field>

                        <label style={checkboxWrapStyle}>
                          <input
                            type="checkbox"
                            checked={passwordForm.mustChangePassword}
                            onChange={(event) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                mustChangePassword: event.target.checked,
                              }))
                            }
                          />
                          <span>Require password change on next login</span>
                        </label>
                      </div>

                      <div style={actionsStyle}>
                        <button
                          type="button"
                          onClick={() => handleResetPassword(user.id)}
                          disabled={saving}
                          style={dangerButtonStyle}
                        >
                          {saving ? "Saving..." : "Update Password"}
                        </button>

                        <button
                          type="button"
                          onClick={closePassword}
                          style={secondaryButtonStyle}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div style={warning ? warningStatCardStyle : statCardStyle}>
      <div style={statLabelStyle}>{label}</div>
      <div style={warning ? warningStatValueStyle : statValueStyle}>
        {value}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={metaLabelStyle}>{label}</div>
      <div style={metaValueStyle}>{value || "-"}</div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: 20,
};

const pageHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 34,
  lineHeight: 1.1,
  fontWeight: 800,
  color: "#171717",
};

const subtitleStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#6f6559",
  fontSize: 14,
  lineHeight: 1.6,
  maxWidth: 760,
};

const roleSettingsButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 12,
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  textDecoration: "none",
  border: "1px solid #171717",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
};

const statCardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 16,
  padding: 16,
};

const warningStatCardStyle: CSSProperties = {
  ...statCardStyle,
  background: "#fff7e8",
  border: "1px solid #ecd8ad",
};

const statLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#756b60",
  fontWeight: 800,
  marginBottom: 7,
};

const statValueStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: "#171717",
};

const warningStatValueStyle: CSSProperties = {
  ...statValueStyle,
  color: "#8a6418",
};

const panelStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 18,
  padding: 18,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const listHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#8a7f72",
  fontWeight: 900,
  marginBottom: 5,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 900,
  color: "#171717",
};

const createGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  alignItems: "end",
};

const filterGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr",
  gap: 12,
  marginBottom: 14,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
};

const labelStyle: CSSProperties = {
  color: "#171717",
  fontSize: 12,
  fontWeight: 900,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 42,
  border: "1px solid #d8cebf",
  borderRadius: 12,
  background: "#fcfbf8",
  color: "#171717",
  padding: "0 12px",
  outline: "none",
  fontSize: 13,
};

const checkboxWrapStyle: CSSProperties = {
  minHeight: 42,
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#5f554b",
  fontWeight: 700,
  fontSize: 13,
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  padding: "0 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: 36,
  borderRadius: 10,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  padding: "0 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid #a54a3f",
  background: "#a54a3f",
  color: "#fff",
  padding: "0 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const usersListStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const userCardStyle: CSSProperties = {
  border: "1px solid #eee5d9",
  borderRadius: 16,
  background: "#fcfbf8",
  padding: 14,
  display: "grid",
  gap: 12,
};

const userTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const topActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const userNameStyle: CSSProperties = {
  color: "#171717",
  fontWeight: 900,
  fontSize: 18,
  marginBottom: 4,
};

const userEmailStyle: CSSProperties = {
  color: "#756b60",
  fontSize: 12,
  fontWeight: 700,
};

const statusPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 30,
  padding: "0 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
};

const metaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 10,
};

const metaLabelStyle: CSSProperties = {
  color: "#756b60",
  fontSize: 11,
  fontWeight: 900,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const metaValueStyle: CSSProperties = {
  color: "#171717",
  fontWeight: 800,
  fontSize: 12,
  lineHeight: 1.5,
};

const editPanelStyle: CSSProperties = {
  borderTop: "1px solid #eee5d9",
  paddingTop: 14,
  display: "grid",
  gap: 14,
};

const editHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const editTitleStyle: CSSProperties = {
  margin: 0,
  color: "#171717",
  fontWeight: 900,
  fontSize: 17,
};

const editGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  alignItems: "end",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const errorBoxStyle: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 800,
};

const successBoxStyle: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontWeight: 800,
};

const emptyStyle: CSSProperties = {
  padding: 16,
  color: "#756b60",
  fontWeight: 800,
};

const loadingCardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 16,
  padding: 18,
  color: "#756b60",
  fontWeight: 800,
};