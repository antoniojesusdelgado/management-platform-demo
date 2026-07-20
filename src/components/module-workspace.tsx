"use client";

import {
  IconArrowUpRight,
  IconCircleCheck,
  IconClock,
  IconDatabase,
  IconSettings,
} from "@tabler/icons-react";
import { useState } from "react";
import { ModuleIcon } from "@/components/module-icon";
import { modules, type ModuleId } from "@/domain/modules";

type ModuleWorkspaceProps = {
  moduleId: Exclude<ModuleId, "inicio" | "vacaciones">;
  organizationName: string;
  onRenameOrganization: (name: string) => void;
};

const content = {
  tareas: {
    eyebrow: "Organización del trabajo",
    metric: "6",
    metricLabel: "tareas activas",
    items: ["Preparar informe semanal", "Validar documentación", "Revisar integración"],
  },
  incidencias: {
    eyebrow: "Soporte operativo",
    metric: "3",
    metricLabel: "incidencias abiertas",
    items: ["Acceso a documento", "Dato pendiente de validar", "Revisión de permiso"],
  },
  tesoreria: {
    eyebrow: "Control financiero",
    metric: "4",
    metricLabel: "movimientos por conciliar",
    items: ["Previsión mensual", "Conciliación de movimientos", "Revisión de vencimientos"],
  },
  nominas: {
    eyebrow: "Ciclo mensual",
    metric: "1",
    metricLabel: "validación pendiente",
    items: ["Recopilar incidencias", "Validar variables", "Cerrar ciclo"],
  },
  personal: {
    eyebrow: "Directorio del equipo",
    metric: "12",
    metricLabel: "perfiles sintéticos",
    items: ["Altas recientes", "Documentación pendiente", "Revisión de roles"],
  },
  novedades: {
    eyebrow: "Evolución del producto",
    metric: "0.2.0",
    metricLabel: "versión de demostración",
    items: ["Nuevo flujo de vacaciones", "Navegación responsive", "Historial de decisiones"],
  },
  configuracion: {
    eyebrow: "Administración",
    metric: "4",
    metricLabel: "roles configurados",
    items: ["Identidad del espacio", "Roles y permisos", "Módulos disponibles"],
  },
} as const;

export function ModuleWorkspace({
  moduleId,
  organizationName,
  onRenameOrganization,
}: ModuleWorkspaceProps) {
  const definition = modules.find((module) => module.id === moduleId)!;
  const details = content[moduleId];
  const [draftName, setDraftName] = useState(organizationName);

  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{details.eyebrow}</p>
          <h1>{definition.label}</h1>
          <p className="lede">{definition.description}</p>
        </div>
        {moduleId !== "configuracion" ? (
          <span className="status-chip">Estructura funcional</span>
        ) : null}
      </div>

      <section className="cards-grid" aria-label={`Resumen de ${definition.label}`}>
        <article className="card">
          <span className="muted">{details.metricLabel}</span>
          <strong className="metric-value">{details.metric}</strong>
        </article>
        <article className="card">
          <span className="muted">Registros revisados</span>
          <strong className="metric-value">8</strong>
        </article>
        <article className="card">
          <span className="muted">Estado del módulo</span>
          <strong className="metric-value" style={{ fontSize: "1.2rem" }}>
            Estructura funcional
          </strong>
        </article>
      </section>

      {moduleId === "configuracion" ? (
        <section className="section-block" aria-labelledby="identity-title">
          <div className="module-placeholder">
            <div className="card">
              <p className="eyebrow">Identidad</p>
              <h2 id="identity-title">Espacio de trabajo</h2>
              <div className="field" style={{ marginTop: "1rem" }}>
                <label htmlFor="organization-name">Nombre visible</label>
                <input
                  id="organization-name"
                  value={draftName}
                  maxLength={80}
                  onChange={(event) => setDraftName(event.target.value)}
                />
              </div>
              <button
                className="button button-primary"
                type="button"
                style={{ marginTop: "1rem" }}
                onClick={() => onRenameOrganization(draftName)}
              >
                Guardar en esta sesión
              </button>
            </div>
            <div className="card">
              <p className="eyebrow">Acceso</p>
              <h2>Roles y permisos</h2>
              <ul className="activity-list">
                {["Administrador", "Responsable", "Colaborador", "Consulta"].map(
                  (role, index) => (
                    <li className="activity-item" key={role}>
                      <span className="attention-icon">
                        <IconSettings aria-hidden="true" size={19} />
                      </span>
                      <span>
                        <strong>{role}</strong>
                        <br />
                        <span className="muted">
                          {index === 0 ? "Todos los permisos" : "Permisos configurables"}
                        </span>
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        </section>
      ) : (
        <section className="section-block" aria-labelledby="module-list-title">
          <div className="module-placeholder">
            <div className="card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Bandeja del módulo</p>
                  <h2 id="module-list-title">Actividad reciente</h2>
                </div>
                <ModuleIcon module={moduleId} aria-hidden="true" size={28} />
              </div>
              <ul className="activity-list">
                {details.items.map((item, index) => (
                  <li className="activity-item" key={item}>
                    <span className={`attention-icon ${index === 1 ? "cyan" : ""}`}>
                      {index === 0 ? (
                        <IconClock aria-hidden="true" size={20} />
                      ) : (
                        <IconCircleCheck aria-hidden="true" size={20} />
                      )}
                    </span>
                    <span style={{ flex: 1 }}>
                      <strong>{item}</strong>
                      <br />
                      <span className="muted">
                        Registro sintético preparado para la siguiente iteración.
                      </span>
                    </span>
                    <IconArrowUpRight aria-hidden="true" size={18} />
                  </li>
                ))}
              </ul>
            </div>
            <aside className="card">
              <p className="eyebrow">Estado</p>
              <h2>Alcance de esta fase</h2>
              <p className="muted">
                El módulo ya dispone de navegación, jerarquía y estados de
                demostración. Su flujo profundo se desarrollará de forma
                incremental.
              </p>
              <div className="empty-state" style={{ minHeight: "160px" }}>
                <IconDatabase aria-hidden="true" size={30} />
                <span>
                  La demo invitada no consulta ni escribe en la base de datos.
                </span>
              </div>
            </aside>
          </div>
        </section>
      )}
    </main>
  );
}
