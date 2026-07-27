import {
  IconBuildingBank,
  IconCalendarEvent,
  IconChecklist,
  IconHistory,
  IconHome,
  IconReceipt2,
  IconSettings,
  IconUsersGroup,
  IconAlertCircle,
  IconFolders,
  IconChartHistogram,
  type IconProps,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { ModuleId } from "@/domain/modules";

const icons: Record<ModuleId, ComponentType<IconProps>> = {
  inicio: IconHome,
  analitica: IconChartHistogram,
  vacaciones: IconCalendarEvent,
  proyectos: IconFolders,
  tareas: IconChecklist,
  incidencias: IconAlertCircle,
  tesoreria: IconBuildingBank,
  nominas: IconReceipt2,
  personal: IconUsersGroup,
  novedades: IconHistory,
  configuracion: IconSettings,
};

export function ModuleIcon({
  module,
  ...props
}: IconProps & { module: ModuleId }) {
  const Icon = icons[module];
  return <Icon {...props} />;
}
