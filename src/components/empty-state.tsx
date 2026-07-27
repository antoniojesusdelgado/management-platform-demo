import {
  IconBriefcase2,
  IconBuildingBank,
  IconPlugConnectedX,
  IconProgressAlert,
  IconUsers,
  IconClipboardList,
  type Icon,
} from "@tabler/icons-react";

export type EmptyStateKind =
  | "work"
  | "projects"
  | "incidents"
  | "people"
  | "finance"
  | "integrations";

const icons: Record<EmptyStateKind, Icon> = {
  work: IconClipboardList,
  projects: IconBriefcase2,
  incidents: IconProgressAlert,
  people: IconUsers,
  finance: IconBuildingBank,
  integrations: IconPlugConnectedX,
};

export function EmptyState({
  kind,
  title,
  description,
}: {
  kind: EmptyStateKind;
  title: string;
  description?: string;
}) {
  const EmptyIcon = icons[kind];

  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <EmptyIcon size={26} stroke={1.7} />
      </span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
