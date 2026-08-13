"use client";

import {
  IconAdjustments,
  IconDeviceFloppy,
  IconLock,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateOwnProfileAction } from "@/app/app/profile-actions";
import {
  profileDashboards,
  profileDensities,
  profileLocales,
  profileThemes,
  profileTimezones,
  type ManagedProfileFields,
  type ProfilePreferencesInput,
  type UserProfile,
} from "@/domain/profile";
import { personRoleCodes, type PersonRoleCode } from "@/domain/people";
import { AvatarUploader } from "@/components/avatar-uploader";
import { AccountErasure } from "@/components/account-erasure";
import { useTheme } from "@/components/theme-provider";
import { formatDateTime } from "@/lib/format";

type WorkspaceStatus = {
  scenarioVersion: number | null;
  lastActiveAt: string;
  databaseSizeBytes: number;
  thresholdBytes: number;
};

type ProfileWorkspaceProps = {
  profile: UserProfile;
  managed: ManagedProfileFields;
  workspaceStatus: WorkspaceStatus | null;
};

const roleLabels: Record<PersonRoleCode, string> = {
  admin: "Administración",
  manager: "Responsable",
  collaborator: "Colaboración",
  viewer: "Consulta",
};

function formatBytes(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "unit",
    unit: "megabyte",
    maximumFractionDigits: 1,
  }).format(value / 1024 / 1024);
}

export function ProfileWorkspace({
  profile,
  managed,
  workspaceStatus,
}: ProfileWorkspaceProps) {
  const [input, setInput] = useState<ProfilePreferencesInput>({
    alias: profile.alias,
    locale: profile.locale,
    timezone: profile.timezone,
    theme: profile.theme,
    density: profile.density,
    reducedMotion: profile.reducedMotion,
    highContrast: profile.highContrast,
    defaultDashboard: profile.defaultDashboard,
    notificationPreferences: profile.notificationPreferences,
    simulatedRole: profile.simulatedRole,
  });
  const [pending, startTransition] = useTransition();
  const { setPreference, setExperiencePreferences } = useTheme();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateOwnProfileAction(input);
      if (result.ok) {
        toast.success("Preferencias actualizadas");
      } else {
        toast.error(result.message);
      }
    });
  }

  const sizeRatio = workspaceStatus
    ? Math.min(
        100,
        (workspaceStatus.databaseSizeBytes / workspaceStatus.thresholdBytes) *
          100,
      )
    : 0;

  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Cuenta · preferencias</p>
          <h1>Mi perfil</h1>
          <p className="lede">
            Personaliza tu experiencia. Los datos operativos administrados
            están separados de tu identidad OAuth.
          </p>
        </div>
        <span className="status-chip">
          <IconShieldCheck aria-hidden="true" size={18} />
          Espacio personal aislado
        </span>
      </div>

      <AvatarUploader
        currentPath={profile.avatarPath}
        currentUrl={profile.avatarUrl}
        displayName={profile.alias ?? profile.displayName}
      />

      <form className="profile-layout" onSubmit={submit}>
        <section className="card profile-section" aria-labelledby="identity-title">
          <div className="section-header">
            <div>
              <p className="eyebrow">Editable</p>
              <h2 id="identity-title">Identidad visible</h2>
            </div>
            <IconUser aria-hidden="true" size={24} />
          </div>
          <div className="field-grid">
            <label className="field">
              Alias visible
              <input
                value={input.alias ?? ""}
                placeholder={profile.displayName}
                onChange={(event) =>
                  setInput({
                    ...input,
                    alias: event.target.value || null,
                  })
                }
              />
            </label>
            <label className="field">
              Idioma
              <select
                value={input.locale}
                onChange={(event) =>
                  setInput({
                    ...input,
                    locale: event.target.value as ProfilePreferencesInput["locale"],
                  })
                }
              >
                {profileLocales.map((locale) => (
                  <option key={locale} value={locale}>
                    {locale === "es-ES" ? "Español" : "English"}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Zona horaria
              <select
                value={input.timezone}
                onChange={(event) =>
                  setInput({
                    ...input,
                    timezone:
                      event.target.value as ProfilePreferencesInput["timezone"],
                  })
                }
              >
                {profileTimezones.map((timezone) => (
                  <option key={timezone}>{timezone}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Dashboard inicial
              <select
                value={input.defaultDashboard}
                onChange={(event) =>
                  setInput({
                    ...input,
                    defaultDashboard:
                      event.target
                        .value as ProfilePreferencesInput["defaultDashboard"],
                  })
                }
              >
                {profileDashboards.map((dashboard) => (
                  <option key={dashboard} value={dashboard}>
                    {dashboard === "analytics"
                      ? "Analítica"
                      : dashboard === "projects"
                        ? "Proyectos"
                        : dashboard === "tasks"
                          ? "Tareas"
                          : "Vacaciones"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section
          className="card profile-section"
          aria-labelledby="appearance-title"
        >
          <div className="section-header">
            <div>
              <p className="eyebrow">Experiencia</p>
              <h2 id="appearance-title">Apariencia y accesibilidad</h2>
            </div>
            <IconAdjustments aria-hidden="true" size={24} />
          </div>
          <div className="field-grid">
            <label className="field">
              Tema
              <select
                value={input.theme}
                onChange={(event) => {
                  const theme =
                    event.target.value as ProfilePreferencesInput["theme"];
                  setInput({ ...input, theme });
                  setPreference(theme);
                }}
              >
                {profileThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme === "light" ? "Claro" : "Oscuro"}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Densidad
              <select
                value={input.density}
                onChange={(event) => {
                  const density =
                    event.target.value as ProfilePreferencesInput["density"];
                  setInput({ ...input, density });
                  setExperiencePreferences({ density });
                }}
              >
                {profileDensities.map((density) => (
                  <option key={density} value={density}>
                    {density === "comfortable" ? "Cómoda" : "Compacta"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="preference-toggles">
            <label>
              <input
                type="checkbox"
                checked={input.reducedMotion}
                onChange={(event) => {
                  const reducedMotion = event.target.checked;
                  setInput({ ...input, reducedMotion });
                  setExperiencePreferences({ reducedMotion });
                }}
              />
              Reducir movimiento
            </label>
            <label>
              <input
                type="checkbox"
                checked={input.highContrast}
                onChange={(event) => {
                  const highContrast = event.target.checked;
                  setInput({ ...input, highContrast });
                  setExperiencePreferences({ highContrast });
                }}
              />
              Contraste reforzado
            </label>
          </div>
        </section>

        <section className="card profile-section" aria-labelledby="role-title">
          <div className="section-header">
            <div>
              <p className="eyebrow">Modo de exploración</p>
              <h2 id="role-title">Simulador de rol</h2>
            </div>
            <IconShieldCheck aria-hidden="true" size={24} />
          </div>
          <p className="muted">
            El modo simulado solo puede reducir los permisos de tu rol real.
            Nunca concede acceso adicional.
          </p>
          <label className="field">
            Modo efectivo
            <select
              value={input.simulatedRole ?? ""}
              onChange={(event) =>
                setInput({
                  ...input,
                  simulatedRole:
                    (event.target.value as PersonRoleCode) || null,
                })
              }
            >
              <option value="">Rol real · {managed.realRole}</option>
              {personRoleCodes.map((role) => (
                <option key={role} value={role}>
                  Simular {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="card profile-section" aria-labelledby="managed-title">
          <div className="section-header">
            <div>
              <p className="eyebrow">Administrado</p>
              <h2 id="managed-title">Ficha profesional</h2>
            </div>
            <IconLock aria-hidden="true" size={24} />
          </div>
          <p className="muted">
            Estos campos requieren permisos administrativos y se muestran en
            modo lectura.
          </p>
          <dl className="request-facts">
            <div>
              <dt>Equipo</dt>
              <dd>{managed.team}</dd>
            </div>
            <div>
              <dt>Puesto</dt>
              <dd>{managed.positionTitle}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{managed.status}</dd>
            </div>
            <div>
              <dt>Disponibilidad</dt>
              <dd>{managed.availability}</dd>
            </div>
          </dl>
        </section>

        <section
          className="card profile-section profile-section-wide"
          id="workspace"
          aria-labelledby="workspace-title"
        >
          <div className="section-header">
            <div>
              <p className="eyebrow">Salud técnica</p>
              <h2 id="workspace-title">Estado del espacio personal</h2>
            </div>
          </div>
          {workspaceStatus ? (
            <>
              <dl className="request-facts">
                <div>
                  <dt>Escenario</dt>
                  <dd>V{workspaceStatus.scenarioVersion ?? "—"}</dd>
                </div>
                <div>
                  <dt>Última actividad</dt>
                  <dd>
                    {formatDateTime(workspaceStatus.lastActiveAt)}
                  </dd>
                </div>
                <div>
                  <dt>Base de datos del proyecto</dt>
                  <dd>{formatBytes(workspaceStatus.databaseSizeBytes)}</dd>
                </div>
                <div>
                  <dt>Umbral de solo lectura</dt>
                  <dd>{formatBytes(workspaceStatus.thresholdBytes)}</dd>
                </div>
              </dl>
              <span
                className="workspace-size-bar"
                role="progressbar"
                aria-label="Uso de la cuota de base de datos"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(sizeRatio)}
              >
                <span style={{ width: `${sizeRatio}%` }} />
              </span>
            </>
          ) : (
            <p className="muted">
              El estado técnico no está disponible temporalmente.
            </p>
          )}
        </section>

        <section className="card profile-section profile-section-wide">
          <h2>Notificaciones internas</h2>
          <div className="preference-toggles">
            {(
              [
                ["inApp", "Actividad general"],
                ["assignments", "Asignaciones"],
                ["reviews", "Revisiones y decisiones"],
                ["mentions", "Menciones"],
                ["automations", "Automatizaciones"],
                ["exports", "Informes y exportaciones"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={input.notificationPreferences[key]}
                  onChange={(event) =>
                    setInput({
                      ...input,
                      notificationPreferences: {
                        ...input.notificationPreferences,
                        [key]: event.target.checked,
                      },
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        <div className="profile-save">
          <button
            className="button button-primary"
            type="submit"
            disabled={pending}
          >
            <IconDeviceFloppy aria-hidden="true" size={19} />
            {pending ? "Guardando…" : "Guardar preferencias"}
          </button>
        </div>
      </form>
      <div className="profile-layout profile-privacy-layout">
        <AccountErasure />
      </div>
    </main>
  );
}
