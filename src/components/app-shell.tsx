"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  IconBuilding,
  IconChartBar,
  IconChevronDown,
  IconHome,
  IconLogout,
  IconMenu2,
  IconRefresh,
  IconSettings,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { switchActiveOrganizationAction } from "@/app/app/organization-actions";
import { InitialsAvatar } from "@/components/initials-avatar";
import { ModuleIcon } from "@/components/module-icon";
import { WorkspaceCommandCenter } from "@/components/workspace-command-center";
import { PRODUCT_VERSION } from "@/config/product-releases";
import type { ActionResult } from "@/domain/action-result";
import type { ModuleId } from "@/domain/modules";
import type { ActiveOrganization } from "@/domain/organizations";
import type { WorkspaceSearchResult, WorkspaceWorkItem } from "@/domain/workspace-productivity";
import { createClient } from "@/lib/supabase/client";

const GUEST_STORAGE_KEY = "management-platform:v1";
const LEGACY_GUEST_STORAGE_KEY = "management-platform-demo:v1";

type AppShellProps = {
  activeModule: ModuleId;
  organizationName: string;
  organizations?: ActiveOrganization[];
  mode: "guest" | "authenticated";
  onNavigate: (module: ModuleId) => void;
  onReset?: () => void;
  avatarUrl?: string | null;
  displayName?: string;
  workspaceSearch?: (query: string) => Promise<ActionResult<WorkspaceSearchResult[]>>;
  workspaceInbox?: () => Promise<ActionResult<WorkspaceWorkItem[]>>;
  unreadCount?: number;
  navigationPending?: boolean;
  onOpenWorkspaceItem?: (item: WorkspaceSearchResult | WorkspaceWorkItem) => void;
  children: ReactNode;
};

const workModules: Array<{ id: ModuleId; label: string }> = [
  { id: "operaciones", label: "Operaciones" },
  { id: "proyectos", label: "Proyectos" },
  { id: "tareas", label: "Tareas" },
  { id: "vacaciones", label: "Vacaciones" },
  { id: "incidencias", label: "Incidencias" },
  { id: "tesoreria", label: "Tesorería" },
  { id: "nominas", label: "Nóminas" },
  { id: "novedades", label: "Novedades" },
];

const moreModules: Array<{ id: ModuleId; label: string }> = [
  ...workModules,
  { id: "configuracion", label: "Configuración" },
];

function NavItem({ id, label, activeModule, onNavigate, onPrefetch }: {
  id: ModuleId;
  label: string;
  activeModule: ModuleId;
  onNavigate: (module: ModuleId) => void;
  onPrefetch: (module: ModuleId) => void;
}) {
  return <button type="button" className="v18-nav-link" aria-current={activeModule === id ? "page" : undefined} onClick={() => onNavigate(id)} onFocus={() => onPrefetch(id)} onPointerEnter={() => onPrefetch(id)}>{label}</button>;
}

export function AppShell({
  activeModule,
  organizationName,
  organizations = [],
  mode,
  onNavigate,
  onReset,
  avatarUrl,
  displayName,
  workspaceSearch,
  workspaceInbox,
  unreadCount = 0,
  navigationPending = false,
  onOpenWorkspaceItem,
  children,
}: AppShellProps) {
  const router = useRouter();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [switching, startSwitch] = useTransition();
  const workActive = workModules.some((module) => module.id === activeModule);

  function prefetchModule(module: ModuleId) {
    if (mode === "authenticated" && module !== activeModule) {
      router.prefetch(`/app/${module}`);
    }
  }

  async function signOut() {
    setSigningOut(true);
    if (mode === "guest") {
      window.sessionStorage.removeItem(GUEST_STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_GUEST_STORAGE_KEY);
      router.replace("/login");
      router.refresh();
      return;
    }
    const { error } = await createClient().auth.signOut({ scope: "local" });
    if (error) { setSigningOut(false); toast.error("No se pudo cerrar la sesión."); return; }
    router.replace("/login");
    router.refresh();
  }

  function switchOrganization(organizationId: string) {
    const target = organizations.find((organization) => organization.id === organizationId);
    if (!target || target.active) return;
    startSwitch(async () => {
      const result = await switchActiveOrganizationAction(organizationId);
      if (!result.ok) { toast.error(result.message); return; }
      toast.success(`Empresa activa: ${target.name}`);
      router.replace("/app/inicio");
      router.refresh();
    });
  }

  return (
    <div className="app-frame app-frame-v18">
      <header className="v18-header" data-navigation-pending={navigationPending ? "true" : undefined}>
        {navigationPending ? (
          <div className="v18-navigation-status" role="status" aria-live="polite">
            <span className="v18-navigation-progress" aria-hidden="true" />
            <span className="sr-only">Cargando el módulo solicitado…</span>
          </div>
        ) : null}
        <div className="v18-header-inner">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className="v18-company-switcher" disabled={switching} aria-label="Cambiar empresa">
                <Image className="v18-brand-symbol" src="/brand-symbol.svg" alt="" width={36} height={36} priority />
                <span><small>{mode === "guest" ? "Modo de exploración" : "Empresa activa"}</small><strong>{mode === "guest" ? "Datos ficticios" : organizationName}</strong></span>
                {mode === "authenticated" ? <IconChevronDown size={16} aria-hidden="true" /> : null}
              </button>
            </DropdownMenu.Trigger>
            {mode === "authenticated" ? <DropdownMenu.Portal><DropdownMenu.Content className="v18-dropdown" align="start" sideOffset={8}>
              <DropdownMenu.Label className="v18-dropdown-label">Tus empresas</DropdownMenu.Label>
              {organizations.map((organization) => <DropdownMenu.Item key={organization.id} className="v18-dropdown-item" onSelect={() => switchOrganization(organization.id)}><span>{organization.name}</span>{organization.active ? <span className="v18-active-dot">Activa</span> : null}</DropdownMenu.Item>)}
              <DropdownMenu.Separator className="user-menu-separator" />
              <DropdownMenu.Item className="v18-dropdown-item v18-module-menu-item" onSelect={() => router.push("/app/empresas/nueva" as Route)}><IconBuilding size={18} /><span>Crear otra empresa</span><span className="v18-dropdown-trailing">+</span></DropdownMenu.Item>
            </DropdownMenu.Content></DropdownMenu.Portal> : null}
          </DropdownMenu.Root>

          <nav className="v18-desktop-nav" aria-label="Navegación principal">
            <NavItem id="inicio" label="Inicio" activeModule={activeModule} onNavigate={onNavigate} onPrefetch={prefetchModule} />
            <DropdownMenu.Root><DropdownMenu.Trigger asChild><button type="button" className="v18-nav-link" aria-current={workActive ? "page" : undefined}>Trabajo <IconChevronDown size={14} /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="v18-dropdown" align="start" sideOffset={8}>{workModules.map((module) => <DropdownMenu.Item key={module.id} className="v18-dropdown-item v18-module-menu-item" onFocus={() => prefetchModule(module.id)} onPointerMove={() => prefetchModule(module.id)} onSelect={() => onNavigate(module.id)}><ModuleIcon module={module.id} size={18} /><span>{module.label}</span></DropdownMenu.Item>)}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>
            <NavItem id="personal" label="Personas" activeModule={activeModule} onNavigate={onNavigate} onPrefetch={prefetchModule} />
            <NavItem id="analitica" label="Analítica" activeModule={activeModule} onNavigate={onNavigate} onPrefetch={prefetchModule} />
            <NavItem id="configuracion" label="Configuración" activeModule={activeModule} onNavigate={onNavigate} onPrefetch={prefetchModule} />
          </nav>

          <div className="v18-header-actions">
            {workspaceSearch && workspaceInbox ? <WorkspaceCommandCenter search={workspaceSearch} loadInbox={workspaceInbox} initialUnreadCount={unreadCount} onOpenItem={onOpenWorkspaceItem} /> : null}
            {onReset ? <button type="button" className="v18-icon-button v18-reset" onClick={onReset} aria-label="Restaurar datos"><IconRefresh size={18} /></button> : null}
            <DropdownMenu.Root><DropdownMenu.Trigger asChild><button className="profile-indicator" type="button" aria-label="Abrir menú de usuario">{avatarUrl ? <Image className="profile-indicator-image" src={avatarUrl} alt="" width={36} height={36} unoptimized /> : <InitialsAvatar displayName={mode === "guest" ? "Usuario invitado" : displayName ?? "Mi cuenta"} size="small" />}<IconChevronDown size={14} /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="user-menu" align="end" sideOffset={8}><div className="user-menu-header"><strong>{mode === "guest" ? "Usuario invitado" : displayName ?? "Mi cuenta"}</strong><span>{mode === "guest" ? `Versión ${PRODUCT_VERSION}` : organizationName}</span></div><DropdownMenu.Separator className="user-menu-separator" /><DropdownMenu.Item className="user-menu-item" onSelect={() => router.push(mode === "authenticated" ? "/app/perfil" : "/app/configuracion")}><IconSettings size={18} />Preferencias</DropdownMenu.Item><DropdownMenu.Separator className="user-menu-separator" /><DropdownMenu.Item className="user-menu-item user-menu-danger" disabled={signingOut} onSelect={signOut}><IconLogout size={18} />{signingOut ? "Cerrando sesión…" : "Cerrar sesión"}</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>
          </div>
        </div>
      </header>

      <div className="app-main app-main-v18">{children}</div>

      <nav className="v18-mobile-nav" aria-label="Navegación móvil">
        <button type="button" aria-current={activeModule === "inicio" ? "page" : undefined} onClick={() => onNavigate("inicio")}><IconHome /><span>Inicio</span></button>
        <button type="button" aria-current={workActive ? "page" : undefined} onClick={() => { onNavigate("operaciones"); }}><IconMenu2 /><span>Trabajo</span></button>
        <button type="button" aria-current={activeModule === "personal" ? "page" : undefined} onClick={() => onNavigate("personal")}><IconUsers /><span>Personas</span></button>
        <button type="button" aria-current={activeModule === "analitica" ? "page" : undefined} onClick={() => onNavigate("analitica")}><IconChartBar /><span>Analítica</span></button>
        <Dialog.Root open={mobileMoreOpen} onOpenChange={setMobileMoreOpen}><Dialog.Trigger asChild><button type="button"><IconMenu2 /><span>Más</span></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="v18-mobile-more" aria-describedby={undefined}><div className="mobile-nav-header"><Dialog.Title>Todos los módulos</Dialog.Title><Dialog.Close asChild><button className="v18-icon-button" type="button" aria-label="Cerrar menú"><IconX /></button></Dialog.Close></div><div className="v18-mobile-module-grid">{moreModules.map((module) => <button type="button" key={module.id} aria-current={activeModule === module.id ? "page" : undefined} onClick={() => { onNavigate(module.id); setMobileMoreOpen(false); }}><ModuleIcon module={module.id} size={20} /><span>{module.label}</span></button>)}{onReset ? <button type="button" onClick={() => { onReset(); setMobileMoreOpen(false); }}><IconRefresh size={20} /><span>Restaurar datos</span></button> : null}</div></Dialog.Content></Dialog.Portal></Dialog.Root>
      </nav>
    </div>
  );
}
