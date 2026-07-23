"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  IconChevronDown,
  IconGridDots,
  IconLogout,
  IconMenu2,
  IconRefresh,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ModuleIcon } from "@/components/module-icon";
import { modules, type ModuleId } from "@/domain/modules";
import { createClient } from "@/lib/supabase/client";

type AppShellProps = {
  activeModule: ModuleId;
  organizationName: string;
  mode: "guest" | "authenticated";
  onNavigate: (module: ModuleId) => void;
  onReset?: () => void;
  children: ReactNode;
};

function Navigation({
  activeModule,
  onNavigate,
  onAfterNavigate,
}: Pick<AppShellProps, "activeModule" | "onNavigate"> & {
  onAfterNavigate?: () => void;
}) {
  return (
    <>
      <div className="brand-mark" aria-hidden="true">
        <IconGridDots size={25} stroke={2.2} />
      </div>
      <p className="sidebar-label">Módulos</p>
      <nav aria-label="Módulos de la plataforma">
        <ul className="nav-list">
          {modules.map((module) => (
            <li key={module.id}>
              <button
                type="button"
                className="nav-button"
                aria-current={activeModule === module.id ? "page" : undefined}
                onClick={() => {
                  onNavigate(module.id);
                  onAfterNavigate?.();
                }}
              >
                <ModuleIcon module={module.id} size={21} aria-hidden="true" />
                <span>{module.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

export function AppShell({
  activeModule,
  organizationName,
  mode,
  onNavigate,
  onReset,
  children,
}: AppShellProps) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  async function signOut() {
    setSigningOut(true);
    const { error } = await createClient().auth.signOut({ scope: "local" });

    if (error) {
      setSigningOut(false);
      toast.error("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Navigation activeModule={activeModule} onNavigate={onNavigate} />
        <div className="sidebar-footer">
          <strong>Plataforma de gestión</strong>
          <br />
          {mode === "guest" ? "Datos sintéticos · sesión local" : organizationName}
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <Dialog.Root
              open={mobileNavigationOpen}
              onOpenChange={setMobileNavigationOpen}
            >
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="icon-button mobile-menu-button"
                  aria-label="Abrir menú de módulos"
                >
                  <IconMenu2 aria-hidden="true" size={21} />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="mobile-nav" aria-describedby={undefined}>
                  <div className="mobile-nav-header">
                    <Dialog.Title>Módulos</Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="Cerrar menú"
                      >
                        <IconX aria-hidden="true" size={20} />
                      </button>
                    </Dialog.Close>
                  </div>
                  <Navigation
                    activeModule={activeModule}
                    onNavigate={onNavigate}
                    onAfterNavigate={() => setMobileNavigationOpen(false)}
                  />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <IconGridDots aria-hidden="true" size={20} />
            <span>Módulos</span>
            <IconChevronDown aria-hidden="true" size={17} />
          </div>

          <div className="topbar-actions">
            {onReset ? (
              <button
                type="button"
                className="button button-quiet"
                aria-label="Restaurar demo"
                onClick={onReset}
              >
                <IconRefresh aria-hidden="true" size={18} />
                <span>Restaurar demo</span>
              </button>
            ) : null}
            <span className="badge">
              {mode === "guest" ? "Datos de demostración" : organizationName}
            </span>
            {mode === "authenticated" ? (
              <button
                type="button"
                className="button button-quiet"
                disabled={signingOut}
                onClick={signOut}
              >
                <IconLogout aria-hidden="true" size={18} />
                <span>{signingOut ? "Cerrando sesión…" : "Cerrar sesión"}</span>
              </button>
            ) : null}
            <span
              className="profile-indicator"
              role="img"
              aria-label={
                mode === "guest"
                  ? "Perfil de usuario invitado"
                  : "Perfil de usuario autenticado"
              }
            >
              <IconUserCircle aria-hidden="true" size={27} />
            </span>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
