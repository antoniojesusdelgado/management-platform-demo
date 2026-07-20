export const moduleIds = [
  "inicio",
  "vacaciones",
  "tareas",
  "incidencias",
  "tesoreria",
  "nominas",
  "personal",
  "novedades",
  "configuracion",
] as const;

export type ModuleId = (typeof moduleIds)[number];

export type ModuleDefinition = {
  id: ModuleId;
  label: string;
  description: string;
  route: `/app/${ModuleId}`;
};

export const modules: readonly ModuleDefinition[] = [
  {
    id: "inicio",
    label: "Inicio",
    description: "Resumen operativo y prioridades de la jornada.",
    route: "/app/inicio",
  },
  {
    id: "vacaciones",
    label: "Vacaciones",
    description: "Solicitudes, aprobaciones, calendario e historial.",
    route: "/app/vacaciones",
  },
  {
    id: "tareas",
    label: "Tareas",
    description: "Asignación, seguimiento y control del trabajo.",
    route: "/app/tareas",
  },
  {
    id: "incidencias",
    label: "Incidencias",
    description: "Registro, priorización y resolución de solicitudes.",
    route: "/app/incidencias",
  },
  {
    id: "tesoreria",
    label: "Tesorería",
    description: "Previsiones, movimientos y conciliación operativa.",
    route: "/app/tesoreria",
  },
  {
    id: "nominas",
    label: "Nóminas",
    description: "Ciclos, validaciones e incidencias de nómina.",
    route: "/app/nominas",
  },
  {
    id: "personal",
    label: "Personal",
    description: "Directorio, situación y documentación del equipo.",
    route: "/app/personal",
  },
  {
    id: "novedades",
    label: "Novedades",
    description: "Historial de cambios y comunicación de versiones.",
    route: "/app/novedades",
  },
  {
    id: "configuracion",
    label: "Configuración",
    description: "Organización, identidad, módulos, roles y permisos.",
    route: "/app/configuracion",
  },
] as const;

export function isModuleId(value: string): value is ModuleId {
  return moduleIds.includes(value as ModuleId);
}
