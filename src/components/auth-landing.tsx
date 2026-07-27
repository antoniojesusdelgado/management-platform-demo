import { IconLock } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { LoginButton } from "@/app/login/login-button";
import { getWorkspaceAccess } from "@/lib/auth";

const errorMessages = {
  oauth:
    "Google no pudo completar el acceso. Revisa la cuenta elegida e inténtalo de nuevo.",
  workspace:
    "La identidad se verificó, pero no se pudo preparar tu espacio personal. Vuelve a intentarlo.",
} as const;

type AuthLandingProps = {
  errorCode?: string;
};

export async function AuthLanding({ errorCode }: AuthLandingProps) {
  const access = await getWorkspaceAccess();
  const error =
    errorCode && errorCode in errorMessages
      ? errorMessages[errorCode as keyof typeof errorMessages]
      : null;

  return (
    <main className="oauth-page">
      <header className="oauth-header">
        <Link className="oauth-brand" href="/" aria-label="Plataforma de gestión">
          <Image
            src="/brand-symbol.svg"
            alt=""
            width={42}
            height={42}
            priority
          />
          <span>
            <strong>Plataforma de gestión</strong>
            <small>Aplicación de demostración</small>
          </span>
        </Link>
      </header>

      <section className="oauth-showcase" aria-labelledby="login-title">
        <div className="oauth-showcase-copy">
          <h1 id="login-title">Gestión diaria en un solo lugar</h1>
          <p>
            Gestiona proyectos, tareas, vacaciones e incidencias desde una
            plataforma centralizada.
          </p>
          <p>
            Mantén la actividad organizada y consulta la información necesaria
            para tomar decisiones.
          </p>
          <p className="oauth-data-notice">
            Esta demostración utiliza únicamente datos ficticios.
          </p>
        </div>
      </section>

      <section className="oauth-panel" aria-label="Acceso a la plataforma">
        <div className="oauth-card">
          <div className="oauth-card-heading">
            <h2>Accede a la plataforma</h2>
            <p className="muted">
              Google se utiliza para verificar la sesión. También puedes
              recorrer la aplicación sin crear una cuenta.
            </p>
          </div>

          {error ? (
            <div className="inline-alert" role="alert">
              <strong>No se pudo completar el acceso.</strong>
              <span>{error}</span>
            </div>
          ) : null}

          {access.status === "active" ? (
            <Link
              className="button google-oauth-button"
              href="/app/inicio"
            >
              <Image src="/google-g.svg" alt="" width={20} height={20} />
              Continuar con Google
            </Link>
          ) : (
            <LoginButton />
          )}

          <div className="oauth-divider">
            <span>o</span>
          </div>

          <Link
            className="button button-secondary oauth-secondary"
            href="/demo/embed"
          >
            Probar sin iniciar sesión
          </Link>

          <p className="oauth-session-note">
            <IconLock aria-hidden="true" size={16} />
            El acceso con Google crea un espacio personal aislado.
          </p>

          <p className="oauth-legal">
            Al continuar aceptas el uso técnico de la sesión descrito en{" "}
            <a href="/privacidad">Privacidad</a>. Consulta también la{" "}
            <a href="/procedencia-datos">procedencia de los datos</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
