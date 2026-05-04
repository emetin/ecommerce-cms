"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";

type AdminRole = {
  id: string;
  roleKey: string;
  name: string;
  permissions: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

type RolesResponse = {
  ok: boolean;
  error?: string;
  items?: AdminRole[];
  permissions?: string[];
};

type RoleFormState = {
  name: string;
  roleKey: string;
  status: string;
  permissions: string[];
};

type PermissionModule = {
  label: string;
  description: string;
  read?: string;
  write?: string;
};

const STATUS_OPTIONS = ["active", "inactive"];

const PERMISSION_MODULES: PermissionModule[] = [
  {
    label: "Dashboard",
    description: "View admin dashboard and basic overview.",
    read: "dashboard:read",
  },
  {
    label: "Products",
    description: "View or manage product catalog.",
    read: "products:read",
    write: "products:write",
  },
  {
    label: "Collections",
    description: "View or manage product collections.",
    read: "collections:read",
    write: "collections:write",
  },
  {
    label: "Blog",
    description: "View or manage blog content.",
    read: "blog:read",
    write: "blog:write",
  },
  {
    label: "Media",
    description: "View or manage uploaded media files.",
    read: "media:read",
    write: "media:write",
  },
  {
    label: "Applications",
    description: "View or manage customer applications.",
    read: "customer_applications:read",
    write: "customer_applications:write",
  },
  {
    label: "Customers",
    description: "View or manage B2B customer accounts.",
    read: "customers:read",
    write: "customers:write",
  },
  {
    label: "Orders",
    description: "View or manage submitted orders.",
    read: "orders:read",
    write: "orders:write",
  },
  {
    label: "Draft Orders",
    description: "View or manage draft orders and quotes.",
    read: "draft_orders:read",
    write: "draft_orders:write",
  },
  {
    label: "Abandoned Carts",
    description: "View abandoned cart records.",
    read: "abandoned_carts:read",
  },
  {
    label: "Checkout Analytics",
    description: "View checkout and funnel analytics.",
    read: "checkout_analytics:read",
  },
  {
    label: "Reports",
    description: "View sales and customer reports.",
    read: "reports:read",
  },
  {
    label: "Users",
    description: "View or manage admin users.",
    read: "users:read",
    write: "users:write",
  },
  {
    label: "Roles",
    description: "View or manage admin roles.",
    read: "roles:read",
    write: "roles:write",
  },
  {
    label: "Settings",
    description: "Manage system-level settings.",
    write: "settings:manage",
  },
];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function buildRoleKey(value: unknown) {
  return normalizeLower(value)
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusStyle(status: string): CSSProperties {
  const normalizedStatus = normalizeLower(status);

  if (normalizedStatus === "active") {
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

function getPermissionLabel(permission: string) {
  const foundModule = PERMISSION_MODULES.find(
    (module) => module.read === permission || module.write === permission
  );

  if (!foundModule) {
    return permission;
  }

  if (foundModule.read === permission) {
    return `${foundModule.label}: View`;
  }

  if (foundModule.write === permission) {
    return `${foundModule.label}: Manage`;
  }

  return permission;
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [editingId, setEditingId] = useState("");

  const [newRole, setNewRole] = useState<RoleFormState>({
    name: "",
    roleKey: "",
    status: "active",
    permissions: [],
  });

  const [editRole, setEditRole] = useState<Omit<RoleFormState, "roleKey">>({
    name: "",
    status: "active",
    permissions: [],
  });

  async function loadRoles() {
    const response = await fetch("/api/admin/roles", {
      cache: "no-store",
    });

    const data = (await response.json()) as RolesResponse;

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to load roles.");
    }

    setRoles(Array.isArray(data.items) ? data.items : []);
    setPermissions(Array.isArray(data.permissions) ? data.permissions : []);
  }

  async function loadPageData() {
    try {
      setLoading(true);
      setErrorMessage("");
      await loadRoles();
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

  const allowedPermissions = useMemo(() => {
    const allModulePermissions = PERMISSION_MODULES.flatMap((module) =>
      [module.read, module.write].filter(Boolean)
    ) as string[];

    return allModulePermissions.filter((permission) =>
      permissions.includes(permission)
    );
  }, [permissions]);

  const filteredRoles = useMemo(() => {
    const query = normalizeLower(searchInput);

    if (!query) {
      return roles;
    }

    return roles.filter((role) => {
      return (
        normalizeLower(role.name).includes(query) ||
        normalizeLower(role.roleKey).includes(query) ||
        normalizeLower(role.status).includes(query) ||
        role.permissions.some((permission) =>
          normalizeLower(getPermissionLabel(permission)).includes(query)
        )
      );
    });
  }, [roles, searchInput]);

  const stats = useMemo(() => {
    return {
      total: roles.length,
      active: roles.filter((role) => normalizeLower(role.status) === "active")
        .length,
      inactive: roles.filter(
        (role) => normalizeLower(role.status) === "inactive"
      ).length,
      permissions: permissions.length,
    };
  }, [roles, permissions]);

  function toggleNewPermission(permission: string) {
    setNewRole((previous) => {
      const exists = previous.permissions.includes(permission);

      return {
        ...previous,
        permissions: exists
          ? previous.permissions.filter((item) => item !== permission)
          : [...previous.permissions, permission],
      };
    });
  }

  function toggleEditPermission(permission: string) {
    setEditRole((previous) => {
      const exists = previous.permissions.includes(permission);

      return {
        ...previous,
        permissions: exists
          ? previous.permissions.filter((item) => item !== permission)
          : [...previous.permissions, permission],
      };
    });
  }

  function selectAllNewPermissions() {
    setNewRole((previous) => ({
      ...previous,
      permissions: allowedPermissions,
    }));
  }

  function clearNewPermissions() {
    setNewRole((previous) => ({
      ...previous,
      permissions: [],
    }));
  }

  function selectAllEditPermissions() {
    setEditRole((previous) => ({
      ...previous,
      permissions: allowedPermissions,
    }));
  }

  function clearEditPermissions() {
    setEditRole((previous) => ({
      ...previous,
      permissions: [],
    }));
  }

  function startEdit(role: AdminRole) {
    setEditingId(role.id);
    setEditRole({
      name: role.name,
      status: role.status || "active",
      permissions: role.permissions || [],
    });
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeEdit() {
    setEditingId("");
  }

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const roleKey = buildRoleKey(newRole.roleKey || newRole.name);

      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizeText(newRole.name),
          roleKey,
          status: normalizeLower(newRole.status || "active") || "active",
          permissions: newRole.permissions,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to create role.");
      }

      setSuccessMessage("Role created successfully.");
      setNewRole({
        name: "",
        roleKey: "",
        status: "active",
        permissions: [],
      });

      await loadRoles();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown create error."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRole(roleId: string) {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/admin/roles/${encodeURIComponent(roleId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: normalizeText(editRole.name),
            status: normalizeLower(editRole.status || "active") || "active",
            permissions: editRole.permissions,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to update role.");
      }

      setSuccessMessage("Role updated successfully.");
      setEditingId("");
      await loadRoles();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown update error."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={loadingCardStyle}>Loading role settings...</div>;
  }

  return (
    <div style={pageStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Role Settings</h1>
          <p style={subtitleStyle}>
            Create roles, update status, and manage access by module.
          </p>
        </div>

        <Link href="/admin/users" style={backButtonStyle}>
          Back to Users & Roles
        </Link>
      </div>

      {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}
      {successMessage ? (
        <div style={successBoxStyle}>{successMessage}</div>
      ) : null}

      <section style={statsGridStyle}>
        <StatCard label="Total Roles" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Inactive" value={stats.inactive} warning />
        <StatCard label="Permissions" value={stats.permissions} />
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <div style={eyebrowStyle}>Create</div>
            <h2 style={panelTitleStyle}>New Role</h2>
          </div>
        </div>

        <form onSubmit={handleCreateRole} style={formStyle}>
          <div style={formGridStyle}>
            <Field label="Role Name">
              <input
                value={newRole.name}
                onChange={(event) =>
                  setNewRole((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                placeholder="Sales Manager"
                style={inputStyle}
              />
            </Field>

            <Field label="Role Key">
              <input
                value={newRole.roleKey}
                onChange={(event) =>
                  setNewRole((previous) => ({
                    ...previous,
                    roleKey: buildRoleKey(event.target.value),
                  }))
                }
                placeholder="sales_manager"
                style={inputStyle}
              />
            </Field>

            <Field label="Status">
              <select
                value={newRole.status}
                onChange={(event) =>
                  setNewRole((previous) => ({
                    ...previous,
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
          </div>

          <PermissionPicker
            title="Module Access"
            selectedPermissions={newRole.permissions}
            availablePermissions={permissions}
            onToggle={toggleNewPermission}
            onSelectAll={selectAllNewPermissions}
            onClearAll={clearNewPermissions}
          />

          <div style={actionsStyle}>
            <button type="submit" disabled={saving} style={primaryButtonStyle}>
              {saving ? "Creating..." : "Create Role"}
            </button>
          </div>
        </form>
      </section>

      <section style={panelStyle}>
        <div style={listHeaderStyle}>
          <div>
            <div style={eyebrowStyle}>Manage</div>
            <h2 style={panelTitleStyle}>Roles</h2>
          </div>

          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search roles..."
            style={searchInputStyle}
          />
        </div>

        <div style={rolesListStyle}>
          {filteredRoles.length === 0 ? (
            <div style={emptyStyle}>No roles matched your filters.</div>
          ) : (
            filteredRoles.map((role) => {
              const isEditing = editingId === role.id;

              return (
                <div key={role.id} style={roleCardStyle}>
                  <div style={roleCardTopStyle}>
                    <div>
                      <div style={roleNameStyle}>{role.name || "-"}</div>
                      <div style={roleKeyStyle}>{role.roleKey || "-"}</div>
                    </div>

                    <div style={topActionsStyle}>
                      <span
                        style={{
                          ...statusPillStyle,
                          ...getStatusStyle(role.status),
                        }}
                      >
                        {role.status || "inactive"}
                      </span>

                      <button
                        type="button"
                        onClick={() => startEdit(role)}
                        style={secondaryButtonStyle}
                      >
                        Edit Role
                      </button>
                    </div>
                  </div>

                  <div style={roleMetaStyle}>
                    <span>{role.permissions.length} permissions</span>
                    <span>Created: {formatDate(role.createdAt)}</span>
                    <span>Updated: {formatDate(role.updatedAt)}</span>
                  </div>

                  <div style={permissionChipsStyle}>
                    {role.permissions.slice(0, 12).map((permission) => (
                      <span key={permission} style={permissionChipStyle}>
                        {getPermissionLabel(permission)}
                      </span>
                    ))}

                    {role.permissions.length > 12 ? (
                      <span style={permissionChipStyle}>
                        +{role.permissions.length - 12} more
                      </span>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div style={editPanelStyle}>
                      <div style={editHeaderStyle}>
                        <div>
                          <div style={eyebrowStyle}>Edit</div>
                          <h3 style={editTitleStyle}>{role.name}</h3>
                        </div>
                      </div>

                      <div style={formGridStyle}>
                        <Field label="Role Name">
                          <input
                            value={editRole.name}
                            onChange={(event) =>
                              setEditRole((previous) => ({
                                ...previous,
                                name: event.target.value,
                              }))
                            }
                            style={inputStyle}
                          />
                        </Field>

                        <Field label="Role Key">
                          <input
                            value={role.roleKey}
                            disabled
                            style={{
                              ...inputStyle,
                              opacity: 0.65,
                              cursor: "not-allowed",
                            }}
                          />
                        </Field>

                        <Field label="Status">
                          <select
                            value={editRole.status}
                            onChange={(event) =>
                              setEditRole((previous) => ({
                                ...previous,
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
                      </div>

                      <PermissionPicker
                        title="Module Access"
                        selectedPermissions={editRole.permissions}
                        availablePermissions={permissions}
                        onToggle={toggleEditPermission}
                        onSelectAll={selectAllEditPermissions}
                        onClearAll={clearEditPermissions}
                      />

                      <div style={actionsStyle}>
                        <button
                          type="button"
                          onClick={() => handleUpdateRole(role.id)}
                          disabled={saving}
                          style={primaryButtonStyle}
                        >
                          {saving ? "Saving..." : "Save Role"}
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
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function PermissionPicker({
  title,
  selectedPermissions,
  availablePermissions,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  title: string;
  selectedPermissions: string[];
  availablePermissions: string[];
  onToggle: (permission: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  return (
    <div style={permissionsBoxStyle}>
      <div style={permissionsHeaderStyle}>
        <div>
          <div style={permissionsTitleStyle}>{title}</div>
          <div style={permissionsSubtitleStyle}>
            {selectedPermissions.length} permissions selected
          </div>
        </div>

        <div style={actionsStyle}>
          <button
            type="button"
            onClick={onSelectAll}
            style={secondaryButtonStyle}
          >
            Select All
          </button>

          <button
            type="button"
            onClick={onClearAll}
            style={secondaryButtonStyle}
          >
            Clear
          </button>
        </div>
      </div>

      <div style={simplePermissionListStyle}>
        {PERMISSION_MODULES.map((module) => {
          const readPermission = module.read || "";
          const writePermission = module.write || "";

          const hasRead =
            Boolean(readPermission) &&
            availablePermissions.includes(readPermission);
          const hasWrite =
            Boolean(writePermission) &&
            availablePermissions.includes(writePermission);

          const canRead = hasRead
            ? selectedPermissions.includes(readPermission)
            : false;

          const canWrite = hasWrite
            ? selectedPermissions.includes(writePermission)
            : false;

          if (!hasRead && !hasWrite) {
            return null;
          }

          return (
            <div key={module.label} style={simplePermissionRowStyle}>
              <div>
                <div style={simplePermissionTitleStyle}>{module.label}</div>
                <div style={simplePermissionHelpStyle}>
                  {module.description}
                </div>
              </div>

              <div style={permissionToggleGroupStyle}>
                {hasRead ? (
                  <label style={smallCheckStyle}>
                    <input
                      type="checkbox"
                      checked={canRead}
                      onChange={() => onToggle(readPermission)}
                    />
                    View
                  </label>
                ) : null}

                {hasWrite ? (
                  <label style={smallCheckStyle}>
                    <input
                      type="checkbox"
                      checked={canWrite}
                      onChange={() => onToggle(writePermission)}
                    />
                    Manage
                  </label>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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

const backButtonStyle: CSSProperties = {
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

const panelHeaderStyle: CSSProperties = {
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

const panelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 900,
  color: "#171717",
};

const formStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
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

const actionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const permissionsBoxStyle: CSSProperties = {
  border: "1px solid #eee5d9",
  borderRadius: 14,
  background: "#faf8f4",
  padding: 14,
  display: "grid",
  gap: 12,
};

const permissionsHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const permissionsTitleStyle: CSSProperties = {
  color: "#171717",
  fontWeight: 900,
  fontSize: 15,
};

const permissionsSubtitleStyle: CSSProperties = {
  marginTop: 4,
  color: "#756b60",
  fontSize: 12,
  fontWeight: 700,
};

const simplePermissionListStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const simplePermissionRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 16,
  alignItems: "center",
  background: "#fff",
  border: "1px solid #eee5d9",
  borderRadius: 12,
  padding: 12,
};

const simplePermissionTitleStyle: CSSProperties = {
  color: "#171717",
  fontWeight: 900,
  fontSize: 13,
};

const simplePermissionHelpStyle: CSSProperties = {
  marginTop: 4,
  color: "#756b60",
  fontSize: 12,
  lineHeight: 1.5,
};

const permissionToggleGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const smallCheckStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "#5f554b",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const listHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
};

const searchInputStyle: CSSProperties = {
  width: 260,
  minHeight: 40,
  border: "1px solid #d8cebf",
  borderRadius: 12,
  background: "#fcfbf8",
  color: "#171717",
  padding: "0 12px",
  outline: "none",
};

const rolesListStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const roleCardStyle: CSSProperties = {
  border: "1px solid #eee5d9",
  borderRadius: 16,
  background: "#fcfbf8",
  padding: 14,
  display: "grid",
  gap: 12,
};

const roleCardTopStyle: CSSProperties = {
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

const roleNameStyle: CSSProperties = {
  color: "#171717",
  fontWeight: 900,
  fontSize: 18,
  marginBottom: 4,
};

const roleKeyStyle: CSSProperties = {
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

const roleMetaStyle: CSSProperties = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  color: "#756b60",
  fontSize: 12,
  fontWeight: 700,
};

const permissionChipsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const permissionChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 26,
  padding: "0 9px",
  borderRadius: 999,
  background: "#fff",
  border: "1px solid #e0d7ca",
  color: "#5f554b",
  fontSize: 11,
  fontWeight: 700,
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

const emptyStyle: CSSProperties = {
  padding: 16,
  color: "#756b60",
  fontWeight: 800,
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

const loadingCardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 16,
  padding: 18,
  color: "#756b60",
  fontWeight: 800,
};