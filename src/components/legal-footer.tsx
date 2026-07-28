import Link from "next/link";

export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <span>© 2026 Antonio Jesús Delgado Briones. Todos los derechos reservados.</span>
      <nav aria-label="Información legal">
        <Link href="/privacidad">Privacidad</Link>
        <Link href="/procedencia-datos">Procedencia de los datos</Link>
        <a href="/aviso-legal">Aviso legal</a>
      </nav>
    </footer>
  );
}
