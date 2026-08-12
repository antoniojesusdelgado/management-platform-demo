import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";

export default function LegalNoticePage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Información legal</p>
        <h1>Aviso legal y propiedad intelectual</h1>
        <p>
          Antonio Jesús Delgado Briones es autor y titular de esta réplica técnica
          pública, de su código original, documentación, identidad visual y
          materiales propios, salvo los componentes de terceros identificados en
          el inventario de licencias.
        </p>
        <p>
          El repositorio se distribuye bajo una licencia propietaria de todos los
          derechos reservados. No se autoriza la reproducción, modificación,
          redistribución, explotación comercial o creación de obras derivadas sin
          autorización expresa y por escrito del titular.
        </p>
        <p>
          El proyecto original fue realizado e implantado en Fundación
          Cibervoluntarios. Esta réplica posterior no contiene código, datos,
          documentos, credenciales, reglas internas, pantallas ni conexiones del
          sistema de la Fundación. Su mención explica el origen funcional y no
          implica patrocinio, afiliación o respaldo del repositorio público.
        </p>
        <p>
          El servicio se facilita con fines de demostración técnica. Aunque se han
          aplicado medidas de calidad y seguridad, no sustituye a un sistema de
          producción ni constituye asesoramiento laboral, financiero o jurídico.
        </p>
        <h2 id="desarrollo-asistido">Desarrollo asistido con inteligencia artificial</h2>
        <p>
          Esta réplica se ha desarrollado mediante programación asistida con
          ChatGPT Codex, bajo dirección, revisión y validación humana. ChatGPT
          Codex no forma parte del producto en ejecución: la aplicación no llama
          a modelos de inteligencia artificial ni necesita claves de OpenAI.
        </p>
        <p>
          Esta declaración aporta transparencia sobre el proceso de desarrollo.
          El Reglamento (UE) 2024/1689 exige etiquetar determinados contenidos
          sintéticos o manipulados, no el software revisado por una persona por
          el mero hecho de haberse programado con asistencia de IA. Por ello no
          se muestra el distintivo europeo de contenido generado por IA, que
          podría atribuir a la interfaz una naturaleza que no tiene.
        </p>
        <p>
          Consulta el <a href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=es" rel="noreferrer">Reglamento europeo de IA</a> y la <a href="https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content" rel="noreferrer">información oficial sobre los distintivos europeos</a>.
        </p>
        <Link className="button button-secondary" href="/login">
          Volver al acceso
        </Link>
        <LegalFooter />
      </article>
    </main>
  );
}
