import Link from "next/link";
import type { Route } from "next";
import { AnalyticsPreferencesButton } from "@/components/analytics-consent";

const contact =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL ??
  "contacto@antoniodelgado.tech";

export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <span>© 2026 Antonio Jesús Delgado Briones. Todos los derechos reservados.</span>
      <nav aria-label="Información legal">
        <Link href="/privacidad">Privacidad</Link>
        <Link href="/procedencia-datos">Procedencia de los datos</Link>
        <Link href="/aviso-legal">Aviso legal</Link>
        <Link href={"/transparencia-ia" as Route}>Transparencia con IA</Link>
        <Link href={"/cookies" as Route}>Cookies</Link>
        <a href={`mailto:${contact}`}>Contacto</a>
        <AnalyticsPreferencesButton />
      </nav>
    </footer>
  );
}
