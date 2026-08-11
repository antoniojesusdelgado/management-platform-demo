import {
  IconAlertCircle,
  IconArrowRight,
  IconCalendarEvent,
  IconChecklist,
  IconClock,
  IconFolder,
  IconPlus,
  IconUsers,
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

export function Dashboard({ onNavigate, summary }: DashboardProps) {
  const upcomingTasks = summary?.upcomingTasks ?? 0;
  const pendingLeave = summary?.pendingLeaveRequests ?? 0;
  const priorityIncidents = summary?.priorityIncidents ?? 0;
  const projectsAtRisk = summary?.projectsAtRisk ?? 0;
  const workload = Math.min(96, 68 + Math.min(upcomingTasks, 14));
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference * (1 - workload / 100);

  return (
    <main className="workspace v18-dashboard" id="main-content">
      <header className="v18-dashboard-heading">
        <div><p className="eyebrow">Centro operativo</p><h1>Buenos días</h1><p className="lede">Aquí tienes lo más importante para avanzar hoy.</p></div>
        <button type="button" className="button button-primary" onClick={() => onNavigate("tareas")}><IconPlus size={18} />Crear trabajo</button>
      </header>

      <div className="v18-dashboard-grid">
        <section className="v18-panel v18-agenda" aria-labelledby="agenda-title">
          <div className="v18-panel-heading"><div><p className="eyebrow">Hoy</p><h2 id="agenda-title">Agenda operativa</h2></div><button type="button" className="button button-quiet" onClick={() => onNavigate("operaciones")}>Ver bandeja <IconArrowRight size={16} /></button></div>
          <div className="v18-timeline">
            <button type="button" onClick={() => onNavigate("tareas")}><time>09:00</time><span className="v18-timeline-dot blue" /><span><strong>Revisar trabajo próximo</strong><small>{upcomingTasks} tareas requieren seguimiento</small></span></button>
            <button type="button" onClick={() => onNavigate("vacaciones")}><time>11:30</time><span className="v18-timeline-dot cyan" /><span><strong>Disponibilidad del equipo</strong><small>{pendingLeave} solicitudes pendientes</small></span></button>
            <button type="button" onClick={() => onNavigate("incidencias")}><time>15:00</time><span className="v18-timeline-dot amber" /><span><strong>Riesgos e incidencias</strong><small>{priorityIncidents} asuntos prioritarios</small></span></button>
          </div>
        </section>

        <section className="v18-panel v18-capacity" aria-labelledby="capacity-title">
          <div className="v18-panel-heading"><div><p className="eyebrow">Esta semana</p><h2 id="capacity-title">Capacidad</h2></div><IconUsers size={21} /></div>
          <div className="v18-capacity-body">
            <svg viewBox="0 0 128 128" role="img" aria-label={`${workload}% de capacidad asignada`}>
              <circle cx="64" cy="64" r="52" className="capacity-ring-track" />
              <circle cx="64" cy="64" r="52" className="capacity-ring-value" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
              <text x="64" y="61" textAnchor="middle" className="capacity-ring-number">{workload}%</text>
              <text x="64" y="80" textAnchor="middle" className="capacity-ring-label">asignada</text>
            </svg>
            <div><strong>Ritmo saludable</strong><p>La carga prevista permite absorber cambios sin comprometer la semana.</p><button type="button" className="row-link" onClick={() => onNavigate("operaciones")}>Planificar capacidad <IconArrowRight size={15} /></button></div>
          </div>
        </section>

        <section className="v18-panel v18-collaboration" aria-labelledby="collaboration-title">
          <div className="v18-panel-heading"><div><p className="eyebrow">Equipo</p><h2 id="collaboration-title">Colaboración</h2></div><button type="button" className="v18-icon-button" onClick={() => onNavigate("personal")} aria-label="Abrir personas"><IconArrowRight size={18} /></button></div>
          <div className="v18-collaboration-list">
            <button type="button" onClick={() => onNavigate("proyectos")}><span className="v18-avatar lilac">PR</span><span><strong>Proyectos en seguimiento</strong><small>{projectsAtRisk ? `${projectsAtRisk} necesitan atención` : "Sin bloqueos críticos"}</small></span><IconFolder size={18} /></button>
            <button type="button" onClick={() => onNavigate("vacaciones")}><span className="v18-avatar blue">EQ</span><span><strong>Disponibilidad compartida</strong><small>Coordina ausencias y cobertura</small></span><IconCalendarEvent size={18} /></button>
          </div>
        </section>
      </div>

      <section className="v18-metrics" aria-label="Resumen de actividad">
        <button type="button" onClick={() => onNavigate("tareas")}><IconChecklist /><span><strong>{upcomingTasks}</strong><small>Tareas próximas</small></span></button>
        <button type="button" onClick={() => onNavigate("vacaciones")}><IconClock /><span><strong>{pendingLeave}</strong><small>Solicitudes por revisar</small></span></button>
        <button type="button" onClick={() => onNavigate("incidencias")}><IconAlertCircle /><span><strong>{priorityIncidents}</strong><small>Incidencias prioritarias</small></span></button>
        <button type="button" onClick={() => onNavigate("proyectos")}><IconFolder /><span><strong>{projectsAtRisk}</strong><small>Proyectos con riesgo</small></span></button>
      </section>
    </main>
  );
}
