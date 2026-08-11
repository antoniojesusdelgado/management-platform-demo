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
import { getSignInProviderAvailability } from "@/lib/env";

const errorMessages = {
  oauth: "No se pudo completar el acceso. Revisa la cuenta elegida e inténtalo de nuevo.",
  workspace: "La identidad se verificó, pero no se pudo cargar tu espacio de trabajo.",
} as const;

type AuthLandingProps = { errorCode?: string };

export async function AuthLanding({ errorCode }: AuthLandingProps) {
  const [access, providers] = await Promise.all([
    getWorkspaceAccess(),
    Promise.resolve(getSignInProviderAvailability()),
  ]);
  const error = errorCode && errorCode in errorMessages
    ? errorMessages[errorCode as keyof typeof errorMessages]
    : null;
  const authenticatedHref = access.status === "active" ? "/app/inicio" : null;

  return (
    <main className="oauth-page oauth-page-v181">
      <header className="oauth-header oauth-header-v181">
        <Link className="oauth-brand" href="/" aria-label="Plataforma de gestión">
          <Image src="/brand-symbol.svg" alt="" width={42} height={42} priority />
          <span className="oauth-brand-copy">
            <strong>Plataforma de gestión</strong>
            <small>Operaciones conectadas</small>
          </span>
        </Link>
      </header>

      <div className="oauth-layout-v181">
        <section className="oauth-showcase oauth-showcase-v181" aria-labelledby="login-title">
          <div className="oauth-showcase-copy">
            <p className="eyebrow">Tu empresa, en contexto</p>
            <h1 id="login-title">Todo el trabajo, con las personas en el centro</h1>
            <p>Coordina proyectos, capacidad y decisiones desde un espacio claro, seguro y conectado.</p>
          </div>
          <div className="oauth-trust-row" aria-label="Características principales">
            <span>Multiempresa</span>
            <span>Google Workspace</span>
            <span>Microsoft 365</span>
          </div>
          <p className="oauth-data-notice">
            <IconInfoCircle aria-hidden="true" size={18} />
            La demostración pública utiliza únicamente datos ficticios.
          </p>
        </section>

        <section className="oauth-panel oauth-panel-v181" aria-label="Acceso a la plataforma">
          <div className="oauth-card oauth-card-v181">
            <div className="oauth-card-heading">
              <p className="eyebrow">Acceso seguro</p>
              <h2>Entra en tu espacio</h2>
              <p className="muted">Usa tu cuenta corporativa o explora el producto sin registro.</p>
            </div>

            {error ? <div className="inline-alert" role="alert"><strong>No se pudo completar el acceso.</strong><span>{error}</span></div> : null}

            <div className="oauth-provider-grid">
              <a className="button google-oauth-button" href={authenticatedHref ?? "/auth/google"} aria-disabled={!providers.google.enabled}>
                <Image src="/google-g.svg" alt="" width={20} height={20} />
                Continuar con Google
              </a>
              {providers.azure.enabled ? (
                <a className="button microsoft-oauth-button" href={authenticatedHref ?? "/auth/microsoft"}>
                  <IconBrandWindows aria-hidden="true" size={20} />
                  Continuar con Microsoft
                </a>
              ) : (
                <button className="button microsoft-oauth-button" type="button" disabled title={providers.azure.reason ?? undefined}>
                  <IconBrandWindows aria-hidden="true" size={20} />
                  Microsoft no disponible
                </button>
              )}
            </div>

            <div className="oauth-divider"><span>o</span></div>
            <Link className="button button-secondary oauth-secondary" href="/demo/embed">
              Explorar sin iniciar sesión <IconArrowRight aria-hidden="true" size={17} />
            </Link>

            <p className="oauth-session-note"><IconLock aria-hidden="true" size={15} />Cada empresa mantiene sus datos y permisos aislados.</p>
            <p className="oauth-legal">Al continuar aceptas la <a href="/privacidad">Privacidad</a>, la <a href="/procedencia-datos">procedencia de los datos</a> y el <a href="/aviso-legal">aviso legal</a>.</p>
          </div>
          <LegalFooter />
        </section>
      </div>
    </main>
  );
}
