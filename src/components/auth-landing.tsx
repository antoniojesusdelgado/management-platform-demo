import { IconArrowRight, IconLock } from "@tabler/icons-react";
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
      <section className="oauth-showcase" aria-labelledby="login-title">
        <Link className="oauth-brand" href="/">
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

        <div className="oauth-showcase-copy">
          <h1 id="login-title">Accede a la plataforma</h1>
          <p>
            Inicia sesión con Google para guardar tus cambios en un espacio
            personal, o entra en la demo sin cuenta.
          </p>
          <p className="oauth-data-notice">
            Esta demostración utiliza únicamente datos ficticios.
          </p>
        </div>

        <Image
          className="oauth-illustration"
          src="/images/product-overview.webp"
          alt="Vista de inicio de la Plataforma de gestión"
          width={1600}
          height={900}
          sizes="(max-width: 980px) 100vw, 58vw"
          priority
        />
      </section>

      <section className="oauth-panel" aria-label="Acceso a la plataforma">
        <div className="oauth-card">
          <div className="oauth-card-heading">
            <p className="eyebrow">Acceso</p>
            <h2>Elige cómo entrar</h2>
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
              className="button button-primary oauth-primary"
              href="/app/inicio"
            >
              Entrar en la aplicación
              <IconArrowRight aria-hidden="true" size={19} />
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
            Entrar sin cuenta
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
