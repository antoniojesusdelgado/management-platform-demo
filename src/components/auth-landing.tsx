import {
  IconBrandWindows,
  IconBuilding,
  IconCircleCheck,
  IconHelpCircle,
  IconLock,
  IconShieldCheck,
  IconUser,
  IconUsers,
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

const benefits = [
  {
    icon: IconCircleCheck,
    title: "Conecta tu empresa",
    copy: "de forma segura",
  },
  {
    icon: IconUsers,
    title: "Colabora con tu equipo",
    copy: "en tiempo real",
  },
  {
    icon: IconShieldCheck,
    title: "Tus datos, siempre",
    copy: "protegidos",
  },
] as const;

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
          <span className="oauth-brand-mark" aria-hidden="true"><IconBuilding size={25} /></span>
          <span className="oauth-brand-copy">
            <small>Plataforma de gestión</small>
            <strong>Plataforma de gestión</strong>
          </span>
        </Link>
        <a className="oauth-help-link" href="#acceso">
          <IconHelpCircle aria-hidden="true" size={18} />
          <span>Ayuda</span>
        </a>
      </header>

      <div className="oauth-layout-v181">
        <section className="oauth-showcase oauth-showcase-v181" aria-labelledby="login-title">
          <div className="oauth-showcase-copy">
            <p className="eyebrow">Accede a tu espacio</p>
            <h1 id="login-title">Todo el trabajo, en un solo lugar</h1>
            <p>Coordina proyectos, capacidad y decisiones desde un espacio claro, seguro y conectado.</p>
          </div>
          <div className="oauth-benefit-list" aria-label="Ventajas de la plataforma">
            {benefits.map(({ icon: Icon, title, copy }) => (
              <div key={title}>
                <span aria-hidden="true"><Icon size={21} /></span>
                <p><strong>{title}</strong><small>{copy}</small></p>
              </div>
            ))}
          </div>
        </section>

        <section id="acceso" className="oauth-panel oauth-panel-v181" aria-label="Acceso a la plataforma">
          <div className="oauth-card oauth-card-v181">
            <div className="oauth-card-heading">
              <p className="eyebrow">Acceso seguro</p>
              <h2>Entra en tu espacio</h2>
              <p className="muted">Usa tu cuenta corporativa para continuar.</p>
            </div>

            {error ? <div className="inline-alert" role="alert"><strong>No se pudo completar el acceso.</strong><span>{error}</span></div> : null}

            <div className="oauth-provider-grid">
              <a className="button google-oauth-button" href={authenticatedHref ?? "/auth/google"} aria-disabled={!providers.google.enabled}>
                <span className="google-oauth-mark" aria-hidden="true"><Image src="/google-g.svg" alt="" width={22} height={22} /></span>
                Continuar con Google
              </a>
              {providers.azure.enabled ? (
                <a className="button microsoft-oauth-button" href={authenticatedHref ?? "/auth/microsoft"}>
                  <IconBrandWindows aria-hidden="true" size={20} />
                  Continuar con Microsoft
                </a>
              ) : (
                <div className="oauth-provider-unavailable">
                  <button className="button microsoft-oauth-button" type="button" disabled aria-describedby="microsoft-provider-help">
                    <IconBrandWindows aria-hidden="true" size={20} />
                    Continuar con Microsoft
                  </button>
                  <span id="microsoft-provider-help">La conexión con Microsoft 365 no está configurada.</span>
                </div>
              )}
            </div>

            <div className="oauth-divider"><span>o</span></div>
            <Link className="button button-secondary oauth-secondary" href="/demo/embed">
              <IconUser aria-hidden="true" size={22} /> Explorar sin iniciar sesión
            </Link>

            <p className="oauth-session-note"><IconLock aria-hidden="true" size={15} />Cada empresa mantiene sus datos y permisos aislados.</p>
            <p className="oauth-legal">Al continuar aceptas la <a href="/privacidad">Privacidad</a>, la <a href="/procedencia-datos">Procedencia de los datos</a> y el <a href="/aviso-legal">Aviso legal</a>.</p>
          </div>
        </section>
      </div>

      <LegalFooter />
    </main>
  );
}
