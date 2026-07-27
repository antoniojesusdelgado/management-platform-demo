"use client";

import {
  IconAdjustments,
  IconArrowDown,
  IconArrowUp,
  IconBuilding,
  IconCalendar,
  IconCategory,
  IconChartBar,
  IconCoins,
  IconHistory,
  IconLock,
  IconMail,
  IconRefresh,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { modules, type ModuleId } from "@/domain/modules";
import { permissionCatalog, type PermissionCode } from "@/domain/permissions";
import {
  invitationInputSchema,
  roleMetadataSchema,
  type AdminAuditEvent,
  type ConfigurableRole,
  type ModuleSetting,
  type WorkspaceInvitation,
  type WorkspaceMembership,
  type WorkspaceMembershipStatus,
} from "@/domain/settings";
import {
  workspaceConfigurationSchema,
  type WorkspaceConfiguration,
} from "@/domain/workspace-configuration";

type Tab =
  | "identity"
  | "operations"
  | "modules"
  | "roles"
  | "access"
  | "dataset"
  | "audit";

type Props = {
  organizationName: string;
  configuration: WorkspaceConfiguration;
  moduleSettings: ModuleSetting[];
  roles: ConfigurableRole[];
  memberships: WorkspaceMembership[];
  invitations: WorkspaceInvitation[];
  auditEvents: AdminAuditEvent[];
  pending?: boolean;
  loadError?: string;
  onRenameOrganization: (name: string) => boolean | Promise<boolean> | void;
  onUpdateConfiguration: (
    configuration: WorkspaceConfiguration,
  ) => boolean | Promise<boolean>;
  onUpdateModule: (
    moduleId: ModuleId,
    enabled: boolean,
    sortOrder: number,
  ) => boolean | Promise<boolean>;
  onUpdateRoleMetadata: (
    roleId: string,
    name: string,
    color: string,
  ) => boolean | Promise<boolean>;
  onUpdateRolePermissions: (
    roleId: string,
    permissions: PermissionCode[],
  ) => boolean | Promise<boolean>;
  onCreateInvitation: (
    email: string,
    roleId: string,
  ) => boolean | Promise<boolean>;
  onUpdateMembership: (
    membershipId: string,
    roleId: string,
    status: WorkspaceMembershipStatus,
  ) => boolean | Promise<boolean>;
  onRestoreDataset?: () => boolean | Promise<boolean>;
};

const permissionLabels = Object.fromEntries(
  permissionCatalog.map((permission) => [
    permission,
    permission
      .replaceAll(".", " · ")
      .replaceAll("_", " ")
      .replace("items", "elementos")
      .replace("manage", "gestionar")
      .replace("view", "consultar"),
  ]),
) as Record<PermissionCode, string>;
permissionLabels["tasks.items.manage"] = "Tareas · gestionar";

function NumberField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-with-suffix">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix ? <span>{suffix}</span> : null}
      </span>
    </label>
  );
}

export function SettingsWorkspace({
  organizationName,
  configuration,
  moduleSettings,
  roles,
  memberships,
  invitations,
  auditEvents,
  pending = false,
  loadError,
  onRenameOrganization,
  onUpdateConfiguration,
  onUpdateModule,
  onUpdateRoleMetadata,
  onUpdateRolePermissions,
  onCreateInvitation,
  onUpdateMembership,
  onRestoreDataset,
}: Props) {
  const [tab, setTab] = useState<Tab>("identity");
  const [name, setName] = useState(organizationName);
  const [draft, setDraft] = useState(configuration);
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");
  const selectedRole =
    roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  const [roleName, setRoleName] = useState(selectedRole?.name ?? "");
  const [roleColor, setRoleColor] = useState(
    selectedRole?.color ?? "#2563eb",
  );
  const [email, setEmail] = useState("");
  const [invitationRoleId, setInvitationRoleId] = useState(
    roles[0]?.id ?? "",
  );
  const [error, setError] = useState("");
  const orderedModules = [...moduleSettings].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const updateDraft = <K extends keyof WorkspaceConfiguration>(
    section: K,
    patch: Partial<WorkspaceConfiguration[K]>,
  ) =>
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], ...patch },
    }));

  function chooseRole(role: ConfigurableRole) {
    setSelectedRoleId(role.id);
    setRoleName(role.name);
    setRoleColor(role.color);
    setError("");
  }

  async function saveIdentity(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    await onRenameOrganization(name.trim());
    setError("");
  }

  async function saveConfiguration(event: React.FormEvent) {
    event.preventDefault();
    const parsed = workspaceConfigurationSchema.safeParse(draft);
    if (!parsed.success) {
      setError("Revisa los límites de las políticas antes de guardar.");
      return;
    }
    if (await onUpdateConfiguration(parsed.data)) setError("");
  }

  async function saveRoleMetadata(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRole) return;
    const parsed = roleMetadataSchema.safeParse({
      name: roleName,
      color: roleColor,
    });
    if (!parsed.success) {
      setError("Revisa el nombre y el color hexadecimal.");
      return;
    }
    if (
      await onUpdateRoleMetadata(
        selectedRole.id,
        parsed.data.name,
        parsed.data.color,
      )
    )
      setError("");
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    const parsed = invitationInputSchema.safeParse({
      email,
      roleId: invitationRoleId,
    });
    if (!parsed.success) {
      setError(
        "Introduce un correo de prueba válido y selecciona un rol.",
      );
      return;
    }
    if (await onCreateInvitation(parsed.data.email, parsed.data.roleId)) {
      setEmail("");
      setError("");
    }
  }

  async function togglePermission(permission: PermissionCode) {
    if (!selectedRole || selectedRole.code === "admin") return;
    const next = selectedRole.permissionCodes.includes(permission)
      ? selectedRole.permissionCodes.filter((code) => code !== permission)
      : [...selectedRole.permissionCodes, permission];
    await onUpdateRolePermissions(selectedRole.id, next);
  }

  const tabs: Array<{
    id: Tab;
    label: string;
    icon: typeof IconBuilding;
  }> = [
    { id: "identity", label: "Identidad y apariencia", icon: IconBuilding },
    { id: "operations", label: "Políticas operativas", icon: IconAdjustments },
    { id: "modules", label: "Módulos", icon: IconCategory },
    { id: "roles", label: "Roles y permisos", icon: IconLock },
    { id: "access", label: "Accesos", icon: IconUsers },
    { id: "dataset", label: "Datos e integraciones", icon: IconRefresh },
    { id: "audit", label: "Auditoría", icon: IconHistory },
  ];

  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Configuración</h1>
          <p className="lede">
            Ajusta la apariencia, los módulos, las políticas, los accesos y las
            integraciones de la organización.
          </p>
        </div>
      </div>
      {loadError ? (
        <div className="inline-alert" role="alert">
          <strong>No se pudo cargar la configuración.</strong>
          <span>{loadError}</span>
        </div>
      ) : null}
      <div className="settings-layout">
        <nav className="settings-tabs" aria-label="Secciones de configuración">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              className="settings-tab"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => {
                setTab(id);
                setError("");
              }}
              key={id}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <section className="settings-panel">
          {tab === "identity" ? (
            <form className="settings-form" onSubmit={saveIdentity}>
              <h2>Identidad y apariencia</h2>
              <p className="muted">
                Ajusta el nombre de la organización y la densidad visual sin
                modificar roles ni permisos.
              </p>
              <label className="field">
                Nombre visible
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <div className="field-grid settings-policy-grid">
                <label className="field">
                  Color de acento
                  <select
                    value={draft.appearance.accent}
                    onChange={(event) =>
                      updateDraft("appearance", {
                        accent: event.target.value as
                          WorkspaceConfiguration["appearance"]["accent"],
                      })
                    }
                  >
                    <option value="indigo">Índigo</option>
                    <option value="teal">Teal</option>
                    <option value="navy">Navy</option>
                  </select>
                </label>
                <label className="field">
                  Densidad
                  <select
                    value={draft.appearance.density}
                    onChange={(event) =>
                      updateDraft("appearance", {
                        density: event.target.value as
                          WorkspaceConfiguration["appearance"]["density"],
                      })
                    }
                  >
                    <option value="comfortable">Cómoda</option>
                    <option value="compact">Compacta</option>
                  </select>
                </label>
                <label className="field">
                  Radio de superficies
                  <select
                    value={draft.appearance.radius}
                    onChange={(event) =>
                      updateDraft("appearance", {
                        radius: event.target.value as
                          WorkspaceConfiguration["appearance"]["radius"],
                      })
                    }
                  >
                    <option value="small">Discreto</option>
                    <option value="medium">Equilibrado</option>
                    <option value="large">Amplio</option>
                  </select>
                </label>
              </div>
              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="form-actions">
                <button className="button button-primary" disabled={pending}>
                  Guardar identidad
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={pending}
                  onClick={() => onUpdateConfiguration(draft)}
                >
                  Aplicar apariencia
                </button>
              </div>
            </form>
          ) : null}

          {tab === "operations" ? (
            <form className="settings-form" onSubmit={saveConfiguration}>
              <h2>Políticas operativas</h2>
              <p className="muted">
                Límites que alimentan alertas, flujos y objetivos
                de Analítica.
              </p>
              <div className="settings-policy-section">
                <h3>
                  <IconCalendar size={18} /> Calendario y vacaciones
                </h3>
                <div className="field-grid settings-policy-grid">
                  <NumberField
                    label="Días anuales"
                    value={draft.vacations.annualAllowanceDays}
                    min={20}
                    max={35}
                    onChange={(annualAllowanceDays) =>
                      updateDraft("vacations", { annualAllowanceDays })
                    }
                  />
                  <NumberField
                    label="Preaviso mínimo"
                    value={draft.vacations.minimumNoticeDays}
                    min={0}
                    max={60}
                    suffix="días"
                    onChange={(minimumNoticeDays) =>
                      updateDraft("vacations", { minimumNoticeDays })
                    }
                  />
                  <NumberField
                    label="Aviso de solapamiento"
                    value={draft.vacations.overlapWarningCount}
                    min={1}
                    max={10}
                    suffix="personas"
                    onChange={(overlapWarningCount) =>
                      updateDraft("vacations", { overlapWarningCount })
                    }
                  />
                </div>
              </div>
              <div className="settings-policy-section">
                <h3>
                  <IconAdjustments size={18} /> Trabajo e incidencias
                </h3>
                <div className="field-grid settings-policy-grid">
                  <NumberField
                    label="WIP en curso"
                    value={draft.tasks.inProgressWip}
                    min={2}
                    max={50}
                    onChange={(inProgressWip) =>
                      updateDraft("tasks", { inProgressWip })
                    }
                  />
                  <NumberField
                    label="WIP en revisión"
                    value={draft.tasks.reviewWip}
                    min={1}
                    max={30}
                    onChange={(reviewWip) =>
                      updateDraft("tasks", { reviewWip })
                    }
                  />
                  <NumberField
                    label="SLA crítico"
                    value={draft.incidents.criticalSlaHours}
                    min={1}
                    max={24}
                    suffix="h"
                    onChange={(criticalSlaHours) =>
                      updateDraft("incidents", { criticalSlaHours })
                    }
                  />
                  <NumberField
                    label="SLA alto"
                    value={draft.incidents.highSlaHours}
                    min={2}
                    max={72}
                    suffix="h"
                    onChange={(highSlaHours) =>
                      updateDraft("incidents", { highSlaHours })
                    }
                  />
                </div>
              </div>
              <div className="settings-policy-section">
                <h3>
                  <IconCoins size={18} /> Finanzas y Analítica
                </h3>
                <div className="field-grid settings-policy-grid">
                  <NumberField
                    label="Confianza de conciliación"
                    value={draft.treasury.autoReconcileConfidence}
                    min={50}
                    max={100}
                    suffix="%"
                    onChange={(autoReconcileConfidence) =>
                      updateDraft("treasury", { autoReconcileConfidence })
                    }
                  />
                  <NumberField
                    label="Aviso de variación de nómina"
                    value={draft.payroll.variationWarningPercent}
                    min={1}
                    max={30}
                    suffix="%"
                    onChange={(variationWarningPercent) =>
                      updateDraft("payroll", { variationWarningPercent })
                    }
                  />
                  <NumberField
                    label="Objetivo SLA"
                    value={draft.analytics.slaTargetPercent}
                    min={50}
                    max={100}
                    suffix="%"
                    onChange={(slaTargetPercent) =>
                      updateDraft("analytics", { slaTargetPercent })
                    }
                  />
                  <NumberField
                    label="Objetivo de margen"
                    value={draft.analytics.cashMarginTargetPercent}
                    min={1}
                    max={40}
                    suffix="%"
                    onChange={(cashMarginTargetPercent) =>
                      updateDraft("analytics", { cashMarginTargetPercent })
                    }
                  />
                </div>
              </div>
              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="button button-primary" disabled={pending}>
                Guardar políticas
              </button>
            </form>
          ) : null}

          {tab === "modules" ? (
            <>
              <h2>Módulos disponibles</h2>
              <p className="muted">
                Inicio permanece activo. El orden define la navegación del
                menú principal.
              </p>
              <ul className="settings-list">
                {orderedModules.map((setting, index) => {
                  const definition = modules.find(
                    (item) => item.id === setting.moduleId,
                  )!;
                  return (
                    <li key={setting.moduleId}>
                      <span>
                        <strong>{definition.label}</strong>
                        <span className="muted settings-list-copy">
                          {definition.description}
                        </span>
                      </span>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={setting.enabled}
                          disabled={setting.moduleId === "inicio" || pending}
                          onChange={(event) =>
                            onUpdateModule(
                              setting.moduleId,
                              event.target.checked,
                              index,
                            )
                          }
                        />
                        Activo
                      </label>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Subir ${definition.label}`}
                          disabled={index === 0 || pending}
                          onClick={() =>
                            onUpdateModule(
                              setting.moduleId,
                              setting.enabled,
                              index - 1,
                            )
                          }
                        >
                          <IconArrowUp size={18} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Bajar ${definition.label}`}
                          disabled={
                            index === orderedModules.length - 1 || pending
                          }
                          onClick={() =>
                            onUpdateModule(
                              setting.moduleId,
                              setting.enabled,
                              index + 1,
                            )
                          }
                        >
                          <IconArrowDown size={18} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          {tab === "roles" && selectedRole ? (
            <>
              <h2>Roles y matriz de permisos</h2>
              <div className="role-selector">
                {roles.map((role) => (
                  <button
                    type="button"
                    key={role.id}
                    className="role-chip"
                    aria-pressed={role.id === selectedRole.id}
                    onClick={() => chooseRole(role)}
                  >
                    <span style={{ background: role.color }} />
                    {role.name}
                  </button>
                ))}
              </div>
              <form
                className="field-grid settings-form"
                onSubmit={saveRoleMetadata}
              >
                <label className="field">
                  Nombre
                  <input
                    value={roleName}
                    onChange={(event) => setRoleName(event.target.value)}
                  />
                </label>
                <label className="field">
                  Color
                  <input
                    type="color"
                    value={roleColor}
                    onChange={(event) => setRoleColor(event.target.value)}
                  />
                </label>
                <button className="button button-secondary" disabled={pending}>
                  Guardar metadatos
                </button>
              </form>
              <h3 className="settings-subheading">Permisos estables</h3>
              <div className="permission-grid">
                {permissionCatalog.map((permission) => (
                  <label key={permission} className="permission-item">
                    <input
                      type="checkbox"
                      checked={selectedRole.permissionCodes.includes(permission)}
                      disabled={selectedRole.code === "admin" || pending}
                      onChange={() => togglePermission(permission)}
                    />
                    <span>
                      <strong>{permissionLabels[permission]}</strong>
                      <code>{permission}</code>
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : null}

          {tab === "access" ? (
            <>
              <h2>Membresías e invitaciones</h2>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>Rol</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberships.map((membership) => (
                      <tr key={membership.id}>
                        <td data-label="Persona">{membership.displayName}</td>
                        <td data-label="Rol">
                          <select
                            value={membership.roleId}
                            disabled={pending}
                            onChange={(event) =>
                              onUpdateMembership(
                                membership.id,
                                event.target.value,
                                membership.status,
                              )
                            }
                          >
                            {roles.map((role) => (
                              <option value={role.id} key={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td data-label="Estado">
                          <select
                            value={membership.status}
                            disabled={pending}
                            onChange={(event) =>
                              onUpdateMembership(
                                membership.id,
                                membership.roleId,
                                event.target.value as WorkspaceMembershipStatus,
                              )
                            }
                          >
                            <option value="invited">Invitada</option>
                            <option value="active">Activa</option>
                            <option value="suspended">Suspendida</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form className="inline-form invitation-form" onSubmit={invite}>
                <label className="field">
                  <span>Correo de prueba</span>
                  <input
                    type="email"
                    placeholder="persona@example.test"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Rol</span>
                  <select
                    value={invitationRoleId}
                    onChange={(event) =>
                      setInvitationRoleId(event.target.value)
                    }
                  >
                    {roles.map((role) => (
                      <option value={role.id} key={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button button-primary" disabled={pending}>
                  <IconMail size={18} />
                  Crear invitación
                </button>
              </form>
              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}
              <ul className="activity-list">
                {invitations.map((invitation) => (
                  <li className="activity-item" key={invitation.id}>
                    <IconMail size={18} />
                    <span>
                      <strong>{invitation.email}</strong>
                      <span className="muted settings-list-copy">
                        {invitation.status} · vence{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString(
                          "es-ES",
                        )}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {tab === "dataset" ? (
            <>
              <h2>Datos e integraciones</h2>
              <div className="settings-summary-grid">
                <article className="settings-summary-card">
                  <IconRefresh size={22} />
                  <strong>Datos de la aplicación</strong>
                  <span>
                    32 personas, 12 proyectos y más de 3.000 registros
                    relacionados.
                  </span>
                </article>
                <article className="settings-summary-card">
                  <IconChartBar size={22} />
                  <strong>Estado inicial</strong>
                  <span>
                    Contenido relacionado que puede restaurarse cuando sea
                    necesario.
                  </span>
                </article>
              </div>
              <div className="field-grid settings-policy-grid">
                <label className="field">
                  Ejecución nocturna UTC
                  <input
                    type="time"
                    value={draft.integrations.scheduleUtc}
                    onChange={(event) =>
                      updateDraft("integrations", {
                        scheduleUtc: event.target.value,
                      })
                    }
                  />
                </label>
                <NumberField
                  label="Reintentos por ejecución"
                  value={draft.integrations.retryLimit}
                  min={0}
                  max={5}
                  onChange={(retryLimit) =>
                    updateDraft("integrations", { retryLimit })
                  }
                />
                <label className="toggle-label settings-checkbox">
                  <input
                    type="checkbox"
                    checked={draft.integrations.notifyOnPartial}
                    onChange={(event) =>
                      updateDraft("integrations", {
                        notifyOnPartial: event.target.checked,
                      })
                    }
                  />
                  Avisar cuando una sincronización sea parcial
                </label>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={pending}
                  onClick={() => onUpdateConfiguration(draft)}
                >
                  Guardar programación
                </button>
                <button
                  type="button"
                  className="button button-danger"
                  disabled={pending || !onRestoreDataset}
                  onClick={() => onRestoreDataset?.()}
                >
                  Restablecer datos
                </button>
              </div>
              <p className="muted">
                Esta acción reemplaza los cambios realizados en los datos de
                prueba. No altera la identidad OAuth.
              </p>
            </>
          ) : null}

          {tab === "audit" ? (
            <>
              <h2>Auditoría administrativa</h2>
              <p className="muted">
                Registro inmutable de cambios de configuración, acceso y
                restauraciones.
              </p>
              {auditEvents.length ? (
                <ul className="request-timeline">
                  {auditEvents.map((event) => (
                    <li key={event.id}>
                      <span className="timeline-dot" />
                      <div>
                        <strong>{event.summary}</strong>
                        <p className="muted">
                          {event.eventType} · {event.actorName} ·{" "}
                          {new Date(event.createdAt).toLocaleString("es-ES")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  <p>Aún no hay cambios administrativos en esta sesión.</p>
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
