import {
  IconArrowRight,
  IconBrandWindows,
  IconInfoCircle,
  IconLock,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";
import { getWorkspaceAccess } from "@/lib/auth";

const errorMessages = {
  oauth: "No se pudo completar el acceso. Revisa la cuenta elegida e inténtalo de nuevo.",
  workspace: "La identidad se verificó, pero no se pudo cargar tu espacio de trabajo.",
} as const;

type AuthLandingProps = { errorCode?: string };

export async function AuthLanding({ errorCode }: AuthLandingProps) {
  const access = await getWorkspaceAccess();
  const error = errorCode && errorCode in errorMessages
    ? errorMessages[errorCode as keyof typeof errorMessages]
    : null;
  const authenticatedHref = access.status === "active" ? "/app/inicio" : null;

  return (
    <main className="oauth-page oauth-page-v18">
      <header className="oauth-header">
        <Link className="oauth-brand" href="/" aria-label="Plataforma de gestión">
          <Image src="/brand-symbol.svg" alt="" width={44} height={44} priority />
          <strong>Plataforma de gestión</strong>
          <small>Operaciones conectadas</small>
        </Link>
      </header>

      <section className="oauth-showcase" aria-labelledby="login-title">
        <div className="oauth-showcase-inner">
          <div className="oauth-showcase-copy">
            <p className="eyebrow">Tu empresa, en contexto</p>
            <h1 id="login-title">Organiza el trabajo sin perder de vista a las personas</h1>
            <p>Coordina proyectos, capacidad, tareas, incidencias y decisiones desde un único espacio.</p>
            <div className="oauth-feature-row" aria-label="Características principales">
              <span>Multiempresa</span><span>Google Workspace</span><span>Microsoft 365</span>
            </div>
          </div>
          <p className="oauth-data-notice">
            <IconInfoCircle aria-hidden="true" size={20} />
            La demostración pública utiliza únicamente datos ficticios.
          </p>
        </div>
      </section>

      <section className="oauth-panel" aria-label="Acceso a la plataforma">
        <div className="oauth-card">
          <div className="oauth-card-heading">
            <p className="eyebrow">Acceso seguro</p>
            <h2>Entra en tu espacio</h2>
            <p className="muted">Usa tu cuenta corporativa o explora el producto sin registro.</p>
          </div>

          {error ? <div className="inline-alert" role="alert"><strong>No se pudo completar el acceso.</strong><span>{error}</span></div> : null}

          <div className="oauth-provider-grid">
            <a className="button google-oauth-button" href={authenticatedHref ?? "/auth/google"}>
              <Image src="/google-g.svg" alt="" width={20} height={20} />
              Continuar con Google
            </a>
            <a className="button microsoft-oauth-button" href={authenticatedHref ?? "/auth/microsoft"}>
              <IconBrandWindows aria-hidden="true" size={21} />
              Continuar con Microsoft
            </a>
          </div>

          <div className="oauth-divider"><span>o</span></div>
          <Link className="button button-secondary oauth-secondary" href="/demo/embed">
            Explorar sin iniciar sesión <IconArrowRight aria-hidden="true" size={18} />
          </Link>

          <p className="oauth-session-note"><IconLock aria-hidden="true" size={16} />Cada empresa mantiene sus datos y permisos aislados.</p>
          <p className="oauth-legal">Al continuar aceptas el uso técnico de la sesión descrito en <a href="/privacidad">Privacidad</a>. Consulta también la <a href="/procedencia-datos">procedencia de los datos</a> y el <a href="/aviso-legal">aviso legal</a>.</p>
        </div>
        <LegalFooter />
      </section>
    </main>
  );
}
