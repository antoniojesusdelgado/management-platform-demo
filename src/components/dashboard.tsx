import Image from "next/image";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconChecklist,
  IconCircleCheck,
  IconFlag3,
  IconInbox,
  IconPlayerPlay,
  IconSearch,
  IconAlertCircle,
} from "@tabler/icons-react";
import type { ModuleId } from "@/domain/modules";

type DashboardProps = {
  onNavigate: (module: ModuleId) => void;
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
] as const;

const weekSteps = [
  { day: "LUN", label: "Planificación", icon: IconChecklist },
  { day: "MAR", label: "Ejecución", icon: IconPlayerPlay },
  { day: "MIÉ", label: "Seguimiento", icon: IconSearch },
  { day: "JUE", label: "Validación", icon: IconCircleCheck },
  { day: "VIE", label: "Cierre", icon: IconFlag3 },
] as const;

export function Dashboard({ onNavigate }: DashboardProps) {
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
        <span className="badge">Información sintética</span>
      </div>

      <section className="hero-panel" aria-labelledby="workday-title">
        <div>
          <h2 id="workday-title">Estado de la jornada</h2>
          <p className="lede">
            Revisa y avanza en los aspectos que requieren tu atención hoy.
            Mantén la operativa al día.
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
        <Image
          className="hero-illustration"
          src="/images/workday-illustration.webp"
          width={720}
          height={405}
          alt="Ilustración de una lista de tareas, material de oficina y una planta"
          priority
        />
      </section>

      <section className="section-block" aria-labelledby="attention-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Bandeja priorizada</p>
            <h2 id="attention-title">Pendientes destacados</h2>
          </div>
          <p className="muted">Tres procesos requieren revisión.</p>
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

      <section className="section-block" aria-labelledby="process-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Cadencia operativa</p>
            <h2 id="process-title">Proceso de la semana</h2>
          </div>
          <p className="muted">
            Secuencia demostrativa, no representa un proceso interno.
          </p>
        </div>
        <ol className="week-process">
          {weekSteps.map((step) => {
            const Icon = step.icon;
            return (
              <li className="week-step" key={step.day}>
                <span className="step-icon">
                  <Icon aria-hidden="true" size={23} />
                </span>
                <span>
                  <span className="step-day">{step.day}</span>
                  <br />
                  <span className="step-label">{step.label}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
