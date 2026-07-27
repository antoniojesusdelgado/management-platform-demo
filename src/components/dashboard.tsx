import {
  IconArrowRight,
  IconCalendarEvent,
  IconChecklist,
  IconFlag3,
  IconInbox,
  IconAlertCircle,
  IconFolder,
} from "@tabler/icons-react";
import type { ModuleId } from "@/domain/modules";

type DashboardProps = {
  onNavigate: (module: ModuleId) => void;
  summary?: {
    pendingLeaveRequests: number;
    upcomingTasks: number;
    priorityIncidents: number;
    projectsAtRisk: number;
  };
};

const attentionItems = [
  {
    title: "Solicitudes de vacaciones",
    description: "Revisa las solicitudes pendientes de aprobación.",
    link: "Ver solicitudes",
    module: "vacaciones",
    icon: IconCalendarEvent,
    tone: "",
  },
  {
    title: "Tareas asignadas",
    description: "Hay trabajo pendiente de revisión y seguimiento.",
    link: "Ver tareas",
    module: "tareas",
    icon: IconChecklist,
    tone: "cyan",
  },
  {
    title: "Incidencias abiertas",
    description: "Revisa y prioriza las incidencias en curso.",
    link: "Ver incidencias",
    module: "incidencias",
    icon: IconAlertCircle,
    tone: "orange",
  },
  {
    title: "Proyectos en seguimiento",
    description: "Consulta el avance, los riesgos y las fechas previstas.",
    link: "Ver proyectos",
    module: "proyectos",
    icon: IconFolder,
    tone: "cyan",
  },
] as const;

export function Dashboard({ onNavigate, summary }: DashboardProps) {
  const todaySummary = [
    {
      label: "Solicitudes por revisar",
      value: summary?.pendingLeaveRequests ?? 0,
      icon: IconCalendarEvent,
    },
    {
      label: "Tareas próximas",
      value: summary?.upcomingTasks ?? 0,
      icon: IconChecklist,
    },
    {
      label: "Incidencias prioritarias",
      value: summary?.priorityIncidents ?? 0,
      icon: IconAlertCircle,
    },
    {
      label: "Proyectos con riesgo",
      value: summary?.projectsAtRisk ?? 0,
      icon: IconFlag3,
    },
  ] as const;
  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Panel operativo</p>
          <h1>Inicio</h1>
          <p className="lede">
            Bienvenido. Aquí tienes una visión general de la jornada y los
            procesos que requieren atención.
          </p>
        </div>
      </div>

      <section className="hero-panel" aria-labelledby="workday-title">
        <div>
          <p className="eyebrow">Hoy</p>
          <h2 id="workday-title">Resumen del día</h2>
          <p className="lede">
            Revisa las tareas próximas, las solicitudes pendientes y las
            incidencias que requieren seguimiento.
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => onNavigate("tareas")}
          >
            <IconInbox aria-hidden="true" size={19} />
            Abrir bandeja de trabajo
          </button>
        </div>
        <div className="dashboard-summary-grid" aria-label="Resumen del día">
          {todaySummary.map((item) => {
            const Icon = item.icon;
            return (
              <article className="dashboard-summary-item" key={item.label}>
                <Icon aria-hidden="true" size={20} />
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block" aria-labelledby="attention-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Seguimiento</p>
            <h2 id="attention-title">Asuntos pendientes</h2>
          </div>
          <p className="muted">Accesos directos a las áreas con actividad.</p>
        </div>
        <div className="attention-list">
          {attentionItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                className="attention-row"
                style={{ width: "100%", borderInline: 0, background: "transparent" }}
                key={item.title}
                onClick={() => onNavigate(item.module)}
              >
                <span className={`attention-icon ${item.tone}`}>
                  <Icon aria-hidden="true" size={23} />
                </span>
                <span className="attention-copy">
                  <h3>{item.title}</h3>
                  <p className="muted">{item.description}</p>
                </span>
                <span className="row-link">{item.link}</span>
                <IconArrowRight aria-hidden="true" size={18} />
              </button>
            );
          })}
        </div>
      </section>

    </main>
  );
}
