import Image from "next/image";
import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";

export default function AiTransparencyPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Transparencia con IA</p>
        <h1>Desarrollo asistido, responsabilidad humana</h1>
        <p>
          La Plataforma de gestión se ha desarrollado con programación asistida
          por GPT-5.3 Codex, GPT-5.4, GPT-5.5 y GPT-5.6 Sol. Estas herramientas
          se han utilizado para analizar requisitos, proponer código, preparar
          documentación y ejecutar comprobaciones reproducibles.
        </p>
        <p>
          La dirección del producto, las decisiones, la revisión editorial, la
          validación y la publicación corresponden a Antonio Jesús Delgado
          Briones. La aplicación en ejecución no integra modelos de OpenAI, no
          mantiene conversaciones automatizadas y no envía los datos de uso a
          OpenAI.
        </p>
        <section className="eu-transparency-card" aria-labelledby="eu-framework-title">
          <Image
            src="/eu-emblem.svg"
            width={108}
            height={72}
            alt="Emblema de la Unión Europea"
          />
          <div>
            <h2 id="eu-framework-title">Marco europeo de transparencia</h2>
            <p>
              Esta declaración informa sobre el proceso de desarrollo. No se usa
              el distintivo de contenido generado por IA porque la interfaz y sus
              textos se publican con revisión y responsabilidad humana.
            </p>
            <p className="muted">
              La Unión Europea no patrocina, certifica ni respalda esta aplicación.
            </p>
          </div>
        </section>
        <h2>Fuentes oficiales</h2>
        <ul>
          <li><a href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=es" rel="noreferrer">Reglamento (UE) 2024/1689</a></li>
          <li><a href="https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems" rel="noreferrer">Directrices de transparencia del artículo 50</a></li>
          <li><a href="https://european-union.europa.eu/legal-notice_es" rel="noreferrer">Condiciones de uso del emblema europeo</a></li>
        </ul>
        <p>
          Para consultas sobre el desarrollo o el tratamiento de datos, escribe a
          <a href="mailto:contacto@antoniodelgado.tech"> contacto@antoniodelgado.tech</a>.
        </p>
        <Link className="button button-secondary" href="/login">Volver al acceso</Link>
        <LegalFooter />
      </article>
    </main>
  );
}
