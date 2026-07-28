"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  IconAdjustments,
  IconChevronDown,
  IconDatabase,
  IconGridDots,
  IconLogout,
  IconMenu2,
  IconRefresh,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { InitialsAvatar } from "@/components/initials-avatar";
import { ModuleIcon } from "@/components/module-icon";
import { modules, type ModuleId } from "@/domain/modules";
import { createClient } from "@/lib/supabase/client";

type AppShellProps = {
  activeModule: ModuleId;
  organizationName: string;
  mode: "guest" | "authenticated";
  onNavigate: (module: ModuleId) => void;
  onReset?: () => void;
  avatarUrl?: string | null;
  displayName?: string;
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
  avatarUrl,
  displayName,
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

  function openProfile() {
    router.push(
      mode === "authenticated" ? "/app/perfil" : "/app/configuracion",
    );
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Navigation activeModule={activeModule} onNavigate={onNavigate} />
        <div className="sidebar-footer">
          <strong>Plataforma de gestión</strong>
          <br />
          {mode === "guest" ? "Sesión local" : organizationName}
          <small>© 2026 Antonio Jesús Delgado Briones.</small>
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
          </div>

          <div className="topbar-actions">
            {onReset ? (
              <button
                type="button"
                className="button button-quiet"
                aria-label="Restaurar datos"
                onClick={onReset}
              >
                <IconRefresh aria-hidden="true" size={18} />
                <span>Restaurar datos</span>
              </button>
            ) : null}
            <span className="badge">
              {mode === "guest" ? "Datos ficticios" : organizationName}
            </span>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="profile-indicator"
                  type="button"
                  aria-label="Abrir menú de usuario"
                >
                  {avatarUrl ? (
                    <Image
                      className="profile-indicator-image"
                      src={avatarUrl}
                      alt=""
                      width={36}
                      height={36}
                      unoptimized
                    />
                  ) : (
                    <InitialsAvatar
                      displayName={
                        mode === "guest"
                          ? "Usuario invitado"
                          : displayName ?? "Mi cuenta"
                      }
                      size="small"
                    />
                  )}
                  <IconChevronDown aria-hidden="true" size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="user-menu"
                  align="end"
                  sideOffset={8}
                >
                  <div className="user-menu-header">
                    <strong>
                      {mode === "guest"
                        ? "Usuario invitado"
                        : displayName ?? "Mi cuenta"}
                    </strong>
                    <span>
                      {mode === "guest" ? "Sesión local" : organizationName}
                    </span>
                  </div>
                  <DropdownMenu.Separator className="user-menu-separator" />
                  <DropdownMenu.Item
                    className="user-menu-item"
                    onSelect={openProfile}
                  >
                    <IconUserCircle aria-hidden="true" size={18} />
                    {mode === "authenticated"
                      ? "Mi perfil"
                      : "Preferencias"}
                  </DropdownMenu.Item>
                  {mode === "authenticated" ? (
                    <>
                      <DropdownMenu.Item
                        className="user-menu-item"
                        onSelect={() => router.push("/app/perfil#role-title")}
                      >
                        <IconAdjustments aria-hidden="true" size={18} />
                        Cambiar modo de rol
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="user-menu-item"
                        onSelect={() => router.push("/app/perfil#workspace")}
                      >
                        <IconDatabase aria-hidden="true" size={18} />
                        Estado del espacio personal
                      </DropdownMenu.Item>
                    </>
                  ) : onReset ? (
                    <DropdownMenu.Item
                      className="user-menu-item"
                      onSelect={onReset}
                    >
                      <IconRefresh aria-hidden="true" size={18} />
                      Restaurar datos
                    </DropdownMenu.Item>
                  ) : null}
                  {mode === "authenticated" ? (
                    <>
                      <DropdownMenu.Separator className="user-menu-separator" />
                      <DropdownMenu.Item
                        className="user-menu-item user-menu-danger"
                        disabled={signingOut}
                        onSelect={signOut}
                      >
                        <IconLogout aria-hidden="true" size={18} />
                        {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
                      </DropdownMenu.Item>
                    </>
                  ) : null}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
