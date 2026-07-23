"use client";

import { IconArrowDown, IconArrowUp, IconBuilding, IconCategory, IconHistory, IconLock, IconMail, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { modules, type ModuleId } from "@/domain/modules";
import { permissionCatalog, type PermissionCode } from "@/domain/permissions";
import { invitationInputSchema, roleMetadataSchema, type AdminAuditEvent, type ConfigurableRole, type ModuleSetting, type WorkspaceInvitation, type WorkspaceMembership, type WorkspaceMembershipStatus } from "@/domain/settings";

type Tab = "identity" | "modules" | "roles" | "access" | "audit";
type Props = {
  organizationName: string;
  moduleSettings: ModuleSetting[];
  roles: ConfigurableRole[];
  memberships: WorkspaceMembership[];
  invitations: WorkspaceInvitation[];
  auditEvents: AdminAuditEvent[];
  pending?: boolean;
  loadError?: string;
  onRenameOrganization: (name: string) => boolean | Promise<boolean> | void;
  onUpdateModule: (moduleId: ModuleId, enabled: boolean, sortOrder: number) => boolean | Promise<boolean>;
  onUpdateRoleMetadata: (roleId: string, name: string, color: string) => boolean | Promise<boolean>;
  onUpdateRolePermissions: (roleId: string, permissions: PermissionCode[]) => boolean | Promise<boolean>;
  onCreateInvitation: (email: string, roleId: string) => boolean | Promise<boolean>;
  onUpdateMembership: (membershipId: string, roleId: string, status: WorkspaceMembershipStatus) => boolean | Promise<boolean>;
};

const permissionLabels: Record<PermissionCode, string> = {
  "vacations.requests.view": "Vacaciones · consultar", "vacations.requests.create": "Vacaciones · solicitar", "vacations.requests.approve": "Vacaciones · aprobar",
  "tasks.items.view": "Tareas · consultar", "tasks.items.manage": "Tareas · gestionar", "incidents.tickets.view": "Incidencias · consultar", "incidents.tickets.manage": "Incidencias · gestionar",
  "treasury.entries.view": "Tesorería · consultar", "treasury.entries.manage": "Tesorería · gestionar", "payroll.runs.view": "Nóminas · consultar", "payroll.runs.manage": "Nóminas · gestionar", "people.profiles.view": "Personal · consultar", "people.profiles.manage": "Personal · gestionar",
  "changelog.entries.view": "Novedades · consultar", "changelog.entries.manage": "Novedades · gestionar", "settings.workspace.manage": "Configuración · administrar",
};

export function SettingsWorkspace({ organizationName, moduleSettings, roles, memberships, invitations, auditEvents, pending = false, loadError, onRenameOrganization, onUpdateModule, onUpdateRoleMetadata, onUpdateRolePermissions, onCreateInvitation, onUpdateMembership }: Props) {
  const [tab, setTab] = useState<Tab>("identity");
  const [name, setName] = useState(organizationName);
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  const [roleName, setRoleName] = useState(selectedRole?.name ?? "");
  const [roleColor, setRoleColor] = useState(selectedRole?.color ?? "#2563eb");
  const [email, setEmail] = useState("");
  const [invitationRoleId, setInvitationRoleId] = useState(roles[0]?.id ?? "");
  const [error, setError] = useState("");
  const orderedModules = [...moduleSettings].sort((a, b) => a.sortOrder - b.sortOrder);

  function chooseRole(role: ConfigurableRole) { setSelectedRoleId(role.id); setRoleName(role.name); setRoleColor(role.color); setError(""); }
  async function saveIdentity(event: React.FormEvent) { event.preventDefault(); if (name.trim().length < 2) { setError("El nombre debe tener al menos 2 caracteres."); return; } await onRenameOrganization(name.trim()); setError(""); }
  async function saveRoleMetadata(event: React.FormEvent) { event.preventDefault(); if (!selectedRole) return; const parsed = roleMetadataSchema.safeParse({ name: roleName, color: roleColor }); if (!parsed.success) { setError("Revisa el nombre y el color hexadecimal."); return; } if (await onUpdateRoleMetadata(selectedRole.id, parsed.data.name, parsed.data.color)) setError(""); }
  async function invite(event: React.FormEvent) { event.preventDefault(); const parsed = invitationInputSchema.safeParse({ email, roleId: invitationRoleId }); if (!parsed.success) { setError("Introduce un correo sintético válido y selecciona un rol."); return; } if (await onCreateInvitation(parsed.data.email, parsed.data.roleId)) { setEmail(""); setError(""); } }
  async function togglePermission(permission: PermissionCode) { if (!selectedRole || selectedRole.code === "admin") return; const next = selectedRole.permissionCodes.includes(permission) ? selectedRole.permissionCodes.filter((code) => code !== permission) : [...selectedRole.permissionCodes, permission]; await onUpdateRolePermissions(selectedRole.id, next); }

  const tabs: Array<{ id: Tab; label: string; icon: typeof IconBuilding }> = [
    { id: "identity", label: "Identidad", icon: IconBuilding }, { id: "modules", label: "Módulos", icon: IconCategory },
    { id: "roles", label: "Roles y permisos", icon: IconLock }, { id: "access", label: "Accesos", icon: IconUsers }, { id: "audit", label: "Auditoría", icon: IconHistory },
  ];

  return <main className="workspace" id="main-content">
    <div className="page-heading"><div><p className="eyebrow">Administración · control verificable</p><h1>Configuración</h1><p className="lede">Identidad, módulos, roles, permisos y accesos con auditoría de cada cambio administrativo.</p></div></div>
    {loadError ? <div className="inline-alert" role="alert"><strong>No se pudo cargar la configuración.</strong><span>{loadError}</span></div> : null}
    <div className="settings-layout"><nav className="settings-tabs" aria-label="Secciones de configuración">{tabs.map(({ id, label, icon: Icon }) => <button type="button" className="settings-tab" aria-current={tab === id ? "page" : undefined} onClick={() => { setTab(id); setError(""); }} key={id}><Icon size={18} />{label}</button>)}</nav><section className="settings-panel">
      {tab === "identity" ? <><h2>Identidad de la organización</h2><p className="muted">Este cambio no modifica roles ni permisos.</p><form className="settings-form" onSubmit={saveIdentity}><label className="field">Nombre visible<input value={name} onChange={(event) => setName(event.target.value)} /></label>{error ? <p className="field-error" role="alert">{error}</p> : null}<button className="button button-primary" disabled={pending}>Guardar identidad</button></form></> : null}
      {tab === "modules" ? <><h2>Módulos disponibles</h2><p className="muted">Inicio permanece activo. El orden se conserva solo durante esta sesión invitada.</p><ul className="settings-list">{orderedModules.map((setting, index) => { const definition = modules.find((item) => item.id === setting.moduleId)!; return <li key={setting.moduleId}><span><strong>{definition.label}</strong><span className="muted settings-list-copy">{definition.description}</span></span><label className="toggle-label"><input type="checkbox" checked={setting.enabled} disabled={setting.moduleId === "inicio" || pending} onChange={(event) => onUpdateModule(setting.moduleId, event.target.checked, index)} />Activo</label><div className="table-actions"><button type="button" className="icon-button" aria-label={`Subir ${definition.label}`} disabled={index === 0 || pending} onClick={() => onUpdateModule(setting.moduleId, setting.enabled, index - 1)}><IconArrowUp size={18} /></button><button type="button" className="icon-button" aria-label={`Bajar ${definition.label}`} disabled={index === orderedModules.length - 1 || pending} onClick={() => onUpdateModule(setting.moduleId, setting.enabled, index + 1)}><IconArrowDown size={18} /></button></div></li>; })}</ul></> : null}
      {tab === "roles" && selectedRole ? <><h2>Roles y matriz de permisos</h2><div className="role-selector">{roles.map((role) => <button type="button" key={role.id} className="role-chip" aria-pressed={role.id === selectedRole.id} onClick={() => chooseRole(role)}><span style={{ background: role.color }} />{role.name}</button>)}</div><form className="field-grid settings-form" onSubmit={saveRoleMetadata}><label className="field">Nombre<input value={roleName} onChange={(event) => setRoleName(event.target.value)} /></label><label className="field">Color<input type="color" value={roleColor} onChange={(event) => setRoleColor(event.target.value)} /></label><p className="muted field-span">Guardar nombre o color no modifica los permisos asignados.</p><button className="button button-secondary" disabled={pending}>Guardar metadatos</button></form><h3 className="settings-subheading">Permisos estables</h3><div className="permission-grid">{permissionCatalog.map((permission) => <label key={permission} className="permission-item"><input type="checkbox" checked={selectedRole.permissionCodes.includes(permission)} disabled={selectedRole.code === "admin" || pending} onChange={() => togglePermission(permission)} /><span><strong>{permissionLabels[permission]}</strong><code>{permission}</code></span></label>)}</div></> : null}
      {tab === "access" ? <><h2>Membresías e invitaciones</h2><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Persona</th><th>Rol</th><th>Estado</th></tr></thead><tbody>{memberships.map((membership) => <tr key={membership.id}><td data-label="Persona">{membership.displayName}</td><td data-label="Rol"><select value={membership.roleId} disabled={pending} onChange={(event) => onUpdateMembership(membership.id, event.target.value, membership.status)}>{roles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select></td><td data-label="Estado"><select value={membership.status} disabled={pending} onChange={(event) => onUpdateMembership(membership.id, membership.roleId, event.target.value as WorkspaceMembershipStatus)}><option value="invited">Invitada</option><option value="active">Activa</option><option value="suspended">Suspendida</option></select></td></tr>)}</tbody></table></div><form className="inline-form invitation-form" onSubmit={invite}><label className="field"><span>Correo sintético</span><input type="email" placeholder="persona@example.test" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="field"><span>Rol</span><select value={invitationRoleId} onChange={(event) => setInvitationRoleId(event.target.value)}>{roles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select></label><button className="button button-primary" disabled={pending}><IconMail size={18} />Crear invitación</button></form>{error ? <p className="field-error" role="alert">{error}</p> : null}<ul className="activity-list">{invitations.map((invitation) => <li className="activity-item" key={invitation.id}><IconMail size={18} /><span><strong>{invitation.email}</strong><span className="muted settings-list-copy">{invitation.status} · vence {new Date(invitation.expiresAt).toLocaleDateString("es-ES")}</span></span></li>)}</ul></> : null}
      {tab === "audit" ? <><h2>Auditoría administrativa</h2><p className="muted">Registro inmutable de cambios realizados durante esta sesión.</p>{auditEvents.length ? <ul className="request-timeline">{auditEvents.map((event) => <li key={event.id}><span className="timeline-dot" /><div><strong>{event.summary}</strong><p className="muted">{event.eventType} · {event.actorName} · {new Date(event.createdAt).toLocaleString("es-ES")}</p></div></li>)}</ul> : <div className="empty-state"><p>Aún no hay cambios administrativos en esta sesión.</p></div>}</> : null}
    </section></div>
  </main>;
}
