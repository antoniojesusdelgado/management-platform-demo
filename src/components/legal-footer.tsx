import Link from "next/link";
import { AnalyticsPreferencesButton } from "@/components/analytics-consent";

const contact =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL ??
  "contacto@antoniodelgado.tech";

export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <span>© 2026 Antonio Jesús Delgado Briones. Todos los derechos reservados.</span>
      <span>
        Desarrollo asistido con ChatGPT Codex, bajo dirección y revisión humana.
      </span>
      <nav aria-label="Información legal">
        <Link href="/privacidad">Privacidad</Link>
        <Link href="/procedencia-datos">Procedencia de los datos</Link>
        <Link href="/aviso-legal">Aviso legal</Link>
        <a href={`mailto:${contact}`}>Contacto</a>
        <AnalyticsPreferencesButton />
      </nav>
    </footer>
  );
}
