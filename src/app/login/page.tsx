import {
  IconArrowRight,
  IconDatabase,
  IconLock,
  IconSparkles,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { LoginButton } from "@/app/login/login-button";
import { getWorkspaceAccess } from "@/lib/auth";

const errorMessages = {
  oauth:
    "Google no pudo completar el acceso. Revisa la cuenta elegida e inténtalo de nuevo.",
  workspace:
    "La identidad se verificó, pero no se pudo preparar el workspace. Vuelve a intentarlo.",
} as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const access = await getWorkspaceAccess();
  const error =
    params.error && params.error in errorMessages
      ? errorMessages[params.error as keyof typeof errorMessages]
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
            <small>Operational workspace</small>
          </span>
        </Link>
        <div className="oauth-showcase-copy">
          <p className="eyebrow">Demo técnica · SaaS operativo</p>
          <h1 id="login-title">
            Toda la operación, conectada en un único workspace.
          </h1>
          <p>
            Explora proyectos, personas, trabajo, automatizaciones y analítica
            avanzada con un escenario completamente sintético.
          </p>
          <ul className="oauth-benefits">
            <li>
              <IconDatabase aria-hidden="true" size={20} />
              24 personas, 8 proyectos y más de 1.000 registros relacionados
            </li>
            <li>
              <IconLock aria-hidden="true" size={20} />
              Workspace persistente y aislado para cada identidad
            </li>
            <li>
              <IconSparkles aria-hidden="true" size={20} />
              Datos regenerables, trazables y sin información real
            </li>
          </ul>
        </div>
        <Image
          className="oauth-illustration"
          src="/oauth-illustration.svg"
          alt=""
          width={680}
          height={360}
          priority
        />
      </section>

      <section className="oauth-panel" aria-label="Acceso a la plataforma">
        <div className="oauth-card">
          <div>
            <p className="eyebrow">Acceso seguro</p>
            <h2>Abre tu workspace de demostración</h2>
            <p className="muted">
              Google se usa exclusivamente para verificar la sesión. La
              aplicación no copia tu correo, nombre ni avatar al directorio
              operativo.
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
              Continuar en mi workspace
              <IconArrowRight aria-hidden="true" size={19} />
            </Link>
          ) : (
            <LoginButton />
          )}
          <div className="oauth-divider">
            <span>o prueba sin cuenta</span>
          </div>
          <Link
            className="button button-secondary oauth-secondary"
            href="/demo/embed"
          >
            Abrir demo invitada
          </Link>
          <div className="oauth-assurances">
            <span>
              <IconLock aria-hidden="true" size={16} />
              OAuth PKCE
            </span>
            <span>Datos sintéticos</span>
            <span>Plan gratuito</span>
          </div>
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
