import Link from "next/link";
import { AnalyticsPreferencesButton } from "@/components/analytics-consent";
import { LegalFooter } from "@/components/legal-footer";

export default function CookiesPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Cookies y medición</p>
        <h1>Tu elección controla la analítica</h1>
        <p>
          La Plataforma de gestión utiliza almacenamiento estrictamente necesario
          para conservar la sesión, la seguridad y tus preferencias. La analítica
          de Google Analytics 4 es opcional y permanece denegada por defecto.
        </p>
        <p>
          Si aceptas, se miden páginas y navegación de forma agregada. No se envían
          nombres, correos, identificadores internos ni contenido de formularios.
          Puedes retirar el consentimiento en cualquier momento.
        </p>
        <AnalyticsPreferencesButton />
        <Link className="button button-secondary" href="/login">Volver al acceso</Link>
        <LegalFooter />
      </article>
    </main>
  );
}
