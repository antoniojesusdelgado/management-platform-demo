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
  type IconProps,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { ModuleId } from "@/domain/modules";

const icons: Record<ModuleId, ComponentType<IconProps>> = {
  inicio: IconHome,
  vacaciones: IconCalendarEvent,
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
